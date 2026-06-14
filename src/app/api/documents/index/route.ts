// src/app/api/documents/index/route.ts — v2
// Uses shared textExtraction, writes index_error for diagnostics

import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { createAdminClient } from '@/utils/supabase/admin';
import { extractTextFromFile } from '@/lib/textExtraction';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const MIN_CHUNK_LENGTH = 50;
const BATCH_SIZE = 5;

function createChunks(text: string): string[] {
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  if (cleaned.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    let chunkEnd = end;

    if (end < cleaned.length) {
      const lastPeriod = cleaned.lastIndexOf('.', end);
      const lastNewline = cleaned.lastIndexOf('\n', end);
      const naturalBreak = Math.max(lastPeriod, lastNewline);
      if (naturalBreak > start + CHUNK_SIZE * 0.8) {
        chunkEnd = naturalBreak + 1;
      }
    }

    const chunk = cleaned.slice(start, chunkEnd).trim();
    if (chunk.length >= MIN_CHUNK_LENGTH) chunks.push(chunk);

    start = chunkEnd - CHUNK_OVERLAP;
    if (start >= chunkEnd) start = chunkEnd;
  }

  return chunks;
}

async function getEmbedding(bedrock: BedrockRuntimeClient, text: string): Promise<{ embedding: number[] | null; error?: string }> {
  try {
    const command = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputText: text.slice(0, 8000) }),
    });
    const response = await bedrock.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    return { embedding: body.embedding as number[] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { embedding: null, error: message };
  }
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function setIndexError(supabase: AdminClient, documentId: string, message: string | null) {
  await supabase
    .from('documents')
    .update({ index_error: message, is_indexed: false })
    .eq('id', documentId);
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { documentId, filePath, userId } = body as { documentId: string; filePath: string; userId: string };

    if (!documentId || !filePath || !userId) {
      return NextResponse.json({ error: 'Missing required fields: documentId, filePath, userId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fast-fail: AWS credentials missing
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      const msg = 'AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are not set in .env.local.';
      await setIndexError(supabase, documentId, msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    await supabase
      .from('documents')
      .update({ file_path: filePath, is_indexed: false, index_error: null })
      .eq('id', documentId)
      .eq('user_id', userId);

    // Download from storage
    const { data: fileData, error: downloadError } = await supabase.storage.from('vault_files').download(filePath);

    if (downloadError || !fileData) {
      const msg = `Storage download failed: ${downloadError?.message || 'unknown error'}.`;
      await setIndexError(supabase, documentId, msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = filePath.split('.').pop()?.toLowerCase() || '';

    // Extract text
    let extractedText = '';
    let pageCount = 1;
    try {
      const result = await extractTextFromFile(buffer, fileExt);
      extractedText = result.text;
      pageCount = result.pageCount;
      if (result.warnings.length > 0) {
        console.warn(`[Index] ${filePath}:`, result.warnings.join('; '));
      }
    } catch (err: unknown) {
      const msg = `Text extraction failed: ${err instanceof Error ? err.message : String(err)}`;
      await setIndexError(supabase, documentId, msg);
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    if (!extractedText || extractedText.trim().length < MIN_CHUNK_LENGTH) {
      const msg = 'No readable text could be extracted. The file may be a scanned image PDF or empty.';
      await setIndexError(supabase, documentId, msg);
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    // Chunk
    const chunks = createChunks(extractedText);
    if (chunks.length === 0) {
      const msg = 'Text was extracted but produced no valid chunks.';
      await setIndexError(supabase, documentId, msg);
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    console.log(`[Index] "${filePath}" → ${chunks.length} chunks, ${pageCount} pages`);

    // Embed + store
    const bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Clear old chunks (re-index support)
    const { error: deleteOldChunksError } = await supabase.from('document_chunks').delete().eq('document_id', documentId);
    if (deleteOldChunksError) {
      const msg = `Database error on document_chunks table: "${deleteOldChunksError.message}". Run SUPABASE_SETUP.sql.`;
      await setIndexError(supabase, documentId, msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    let successCount = 0;
    let failCount = 0;
    let lastEmbeddingError: string | undefined;
    let lastInsertError: string | undefined;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (chunk, batchIdx) => {
          const chunkIndex = i + batchIdx;
          const { embedding, error: embedError } = await getEmbedding(bedrock, chunk);

          if (!embedding) {
            failCount++;
            lastEmbeddingError = embedError;
            return;
          }

          const { error: insertError } = await supabase.from('document_chunks').insert({
            document_id: documentId,
            content: chunk,
            chunk_index: chunkIndex,
            embedding,
          });

          if (insertError) {
            failCount++;
            lastInsertError = insertError.message;
          } else {
            successCount++;
          }
        })
      );
    }

    const elapsed = Date.now() - startTime;

    if (successCount === 0) {
      let msg = 'All embedding attempts failed.';
      if (lastEmbeddingError) msg += ` Bedrock error: "${lastEmbeddingError}".`;
      if (lastInsertError) msg += ` DB insert error: "${lastInsertError}".`;
      await setIndexError(supabase, documentId, msg);
      return NextResponse.json({ error: msg, chunksAttempted: chunks.length, chunksStored: 0 }, { status: 500 });
    }

    // Success
    await supabase
      .from('documents')
      .update({
        is_indexed: true,
        index_error: null,
        page_count: pageCount,
        chunk_count: successCount,
      })
      .eq('id', documentId);

    console.log(`[Index] Done. ${successCount}/${chunks.length} chunks stored in ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      chunksStored: successCount,
      chunksAttempted: chunks.length,
      chunksFailed: failCount,
      pageCount,
      elapsedMs: elapsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown indexing error';
    console.error('[Index] Fatal error:', message);

    try {
      const body = await req.clone().json();
      if (body?.documentId) {
        const supabase = createAdminClient();
        await setIndexError(supabase, body.documentId, message);
      }
    } catch { /* ignore */ }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
