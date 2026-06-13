import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import pdfParse from 'pdf-parse';

export async function POST(req: NextRequest) {
  try {
    const { documentId, filePath, userId } = await req.json();

    if (!documentId || !filePath || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Initialize Supabase Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // Using service role to bypass RLS for background indexing, or anon key since RLS is off
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('vault_files')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message}`);
    }

    // 3. Parse the PDF
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // Basic chunking: split by paragraphs and group
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    const chunks = [];
    let currentChunk = '';
    
    for (const p of paragraphs) {
      if ((currentChunk + p).length < 1500) {
        currentChunk += p + '\n\n';
      } else {
        chunks.push(currentChunk.trim());
        currentChunk = p + '\n\n';
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    // 4. Initialize AWS Bedrock Client
    // Ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are in .env.local
    const bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    // 5. Generate embeddings and store in Supabase
    for (const chunk of chunks) {
      if (!chunk) continue;

      try {
        const embedCommand = new InvokeModelCommand({
          modelId: 'amazon.titan-embed-text-v1', // 1536 dimensions
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({ inputText: chunk }),
        });

        const response = await bedrock.send(embedCommand);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const embedding = responseBody.embedding;

        // Insert chunk into document_chunks table
        const { error: insertError } = await supabase
          .from('document_chunks')
          .insert({
            document_id: documentId,
            content: chunk,
            embedding: embedding, // pgvector handles arrays automatically
          });

        if (insertError) {
          console.error('Error inserting chunk:', insertError);
        }
      } catch (awsError) {
        console.warn('AWS Bedrock Embedding failed for chunk. Skipping...', awsError);
      }
    }

    // 6. Update document status to indexed
    await supabase
      .from('documents')
      .update({ is_indexed: true, page_count: pdfData.numpages })
      .eq('id', documentId);

    return NextResponse.json({ success: true, chunksProcessed: chunks.length });

  } catch (error: any) {
    console.error('Indexing error:', error);
    return NextResponse.json({ error: error.message || 'Failed to index document' }, { status: 500 });
  }
}
