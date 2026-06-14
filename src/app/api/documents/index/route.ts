import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { createAdminClient } from '@/utils/supabase/admin';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const MIN_CHUNK_LENGTH = 50;

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

    if (chunk.length >= MIN_CHUNK_LENGTH) {
      chunks.push(chunk);
    }

    start = chunkEnd - CHUNK_OVERLAP;

    if (start >= chunkEnd) {
      start = chunkEnd;
    }
  }

  return chunks;
}

async function getEmbedding(
  bedrock: BedrockRuntimeClient,
  text: string
): Promise<number[] | null> {
  try {
    const command = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputText: text.slice(0, 8000) }),
    });

    const response = await bedrock.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    return body.embedding as number[];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Bedrock] Embedding failed:', message);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { documentId, filePath, userId } = body as {
      documentId: string;
      filePath: string;
      userId: string;
    };

    if (!documentId || !filePath || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, filePath, userId' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    await supabase
      .from('documents')
      .update({
        file_path: filePath,
        is_indexed: false,
      })
      .eq('id', documentId)
      .eq('user_id', userId);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('vault_files')
      .download(filePath);

    if (downloadError || !fileData) {
      await markFailed(supabase, documentId, `Storage download failed: ${downloadError?.message}`);
      return NextResponse.json(
        { error: `Failed to download file: ${downloadError?.message}` },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = filePath.split('.').pop()?.toLowerCase();

    let extractedText = '';
    let pageCount = 1;

    if (fileExt === 'pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
      pageCount = pdfData.numpages;
    } else if (fileExt === 'docx') {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } catch {
        extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ');
      }
    } else {
      extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ');
    }

    if (!extractedText || extractedText.trim().length < MIN_CHUNK_LENGTH) {
      await markFailed(supabase, documentId, 'No readable text could be extracted.');
      return NextResponse.json(
        { error: 'No text extracted. The file may be a scanned image or corrupted.' },
        { status: 422 }
      );
    }

    const chunks = createChunks(extractedText);

    if (chunks.length === 0) {
      await markFailed(supabase, documentId, 'Text extraction produced no valid chunks.');
      return NextResponse.json({ error: 'No chunks produced' }, { status: 422 });
    }

    const bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    let successCount = 0;
    let failCount = 0;

    const BATCH_SIZE = 5;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (chunk, batchIdx) => {
          const chunkIndex = i + batchIdx;
          const embedding = await getEmbedding(bedrock, chunk);

          if (!embedding) {
            failCount++;
            return;
          }

          const { error: insertError } = await supabase
            .from('document_chunks')
            .insert({
              document_id: documentId,
              content: chunk,
              chunk_index: chunkIndex,
              embedding,
            });

          if (insertError) {
            failCount++;
          } else {
            successCount++;
          }
        })
      );
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        is_indexed: successCount > 0,
        page_count: pageCount,
        chunk_count: successCount,
      })
      .eq('id', documentId);

    const elapsed = Date.now() - startTime;

    if (successCount === 0) {
      return NextResponse.json(
        {
          error: 'All embedding attempts failed. Check credentials and region.',
          chunksAttempted: chunks.length,
          chunksStored: 0,
        },
        { status: 500 }
      );
    }

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function markFailed(
  supabase: ReturnType<typeof import('@/utils/supabase/admin').createAdminClient>,
  documentId: string,
  reason: string
) {
  await supabase
    .from('documents')
    .update({ is_indexed: false })
    .eq('id', documentId);
}
