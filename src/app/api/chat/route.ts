import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getMockAIResponse } from '@/lib/aiResponses';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, context } = body as { message: string, context?: any };

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare User Profile Context string
    let profileContextStr = "No user profile available.";
    if (context) {
      profileContextStr = `
Student Name: ${context.profile?.name || 'Unknown'}
Semester: ${context.profile?.semester || 'Unknown'}
Major: ${context.profile?.major || 'Unknown'}

Their current pending tasks:
${context.tasks?.map((t: any) => `- ${t.title} (Due: ${t.dueDate})`).join('\n') || 'None'}

Their weekly classes:
${context.classes?.map((c: any) => `- ${c.title} (${c.type}) on ${c.time}`).join('\n') || 'None'}
      `;
    }

    try {
      const bedrock = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
      });

      // 1. Try to Embed the user's message using AWS
      let embedding: number[] | null = null;
      try {
        const embedCommand = new InvokeModelCommand({
          modelId: 'amazon.titan-embed-text-v1', // 1536 dimensions
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({ inputText: message }),
        });

        const embedResponse = await bedrock.send(embedCommand);
        const embedBody = JSON.parse(new TextDecoder().decode(embedResponse.body));
        embedding = embedBody.embedding;
      } catch (awsError: any) {
        console.warn('AWS Embeddings failed. IAM/Region issue.', awsError.message);
      }

      // 2. Search Supabase for similar chunks OR fallback to all chunks
      let contextText = '';
      const sources: any[] = [];
      
      const userId = context?.profile?.id;

      if (embedding && userId) {
        const { data: chunks, error: searchError } = await supabase.rpc('match_document_chunks', {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: 5,
        });

        if (chunks && chunks.length > 0) {
          // Filter chunks to only include those belonging to the current user
          const validChunks = [];
          const uniqueDocs = Array.from(new Set(chunks.map((c: any) => c.document_id)));
          
          for (const docId of uniqueDocs) {
            const { data: docData } = await supabase.from('documents')
              .select('name')
              .eq('id', docId)
              .eq('user_id', userId)
              .single();
            
            if (docData) {
              sources.push({ title: docData.name, type: 'PDF' });
              // Include chunks from this document
              validChunks.push(...chunks.filter((c: any) => c.document_id === docId));
            }
          }

          if (validChunks.length > 0) {
            contextText = validChunks.map((c: any) => c.content).join('\n\n---\n\n');
          } else {
            contextText = "No relevant documents found in the Knowledge Vault.";
          }
        } else {
          contextText = "No relevant documents found in the Knowledge Vault.";
        }
      } else if (userId) {
        // Fallback RAG: If AWS embeddings failed, just grab recent document chunks directly!
        const { data: userDocs } = await supabase.from('documents').select('id').eq('user_id', userId);
        const docIds = userDocs?.map(d => d.id) || [];
        
        if (docIds.length > 0) {
          const { data: fallbackChunks } = await supabase.from('document_chunks')
            .select('content, document_id')
            .in('document_id', docIds)
            .limit(5);
          
          if (fallbackChunks && fallbackChunks.length > 0) {
            contextText = fallbackChunks.map((c: any) => c.content).join('\n\n---\n\n');
            sources.push({ title: "Knowledge Vault (Fallback)", type: "PDF" });
          } else {
            contextText = "No relevant documents found in the Knowledge Vault.";
          }
        } else {
           contextText = "No relevant documents found in the Knowledge Vault.";
        }
      } else {
        contextText = "No relevant documents found in the Knowledge Vault.";
      }

      // 3. Generate Answer
      const systemPrompt = `You are CampusFlow AI, a highly intelligent and friendly student assistant. 
Your goal is to help the student with their academic questions, schedule, and general knowledge.

Below is the student's personal profile and live dashboard context. You must use this context if they ask questions about themselves, their schedule, or their tasks:
<user_profile>
${profileContextStr}
</user_profile>

Below is some context retrieved from the student's own documents in their Knowledge Vault.
If this context is relevant to the user's question, use it to provide a highly accurate and personalized answer.
If the context is NOT relevant to the question, feel free to answer using your own general knowledge.

<document_context>
${contextText}
</document_context>`;

      // Determine whether to use OpenRouter or AWS Bedrock for LLM
      const openRouterKey = process.env.OPEN_ROUTER_API_KEY;
      
      if (openRouterKey) {
        // Use OpenRouter (Claude 3 Haiku)
        const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "model": "anthropic/claude-3-haiku",
            "messages": [
              { "role": "system", "content": systemPrompt },
              { "role": "user", "content": message }
            ]
          })
        });

        const orData = await orResponse.json();
        const answer = orData.choices[0].message.content;

        return NextResponse.json({
          role: 'assistant',
          content: answer,
          sources: sources,
          model: 'CampusFlow AI (OpenRouter Claude 3)',
          timestamp: new Date().toISOString(),
        });
      } else {
        // Fallback to local mock if OpenRouter is missing
        console.warn('No OpenRouter key found. Falling back to local mock.');
        const { content, sources: mockSources } = getMockAIResponse(message);
        return NextResponse.json({
          role: 'assistant',
          content: `*(System Offline: OpenRouter key missing)*\n\n${content}`,
          sources: mockSources ?? [],
          model: 'CampusFlow AI (Fallback)',
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error: any) {
      console.error('Chat API error:', error);
      return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Outer Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
