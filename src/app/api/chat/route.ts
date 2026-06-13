import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

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

    const bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    // 1. Embed the user's message
    const embedCommand = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputText: message }),
    });

    const embedResponse = await bedrock.send(embedCommand);
    const embedBody = JSON.parse(new TextDecoder().decode(embedResponse.body));
    const embedding = embedBody.embedding;

    // 2. Search Supabase for similar chunks
    const { data: chunks, error: searchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5,
    });

    if (searchError) {
      console.error('Search error:', searchError);
    }

    // 3. Construct context
    let contextText = '';
    const sources: any[] = [];
    if (chunks && chunks.length > 0) {
      contextText = chunks.map((c: any) => c.content).join('\n\n---\n\n');
      
      const uniqueDocs = Array.from(new Set(chunks.map((c: any) => c.document_id)));
      for (const docId of uniqueDocs) {
        const { data: docData } = await supabase.from('documents').select('name').eq('id', docId).single();
        if (docData) {
          sources.push({ title: docData.name, type: 'PDF' });
        }
      }
    } else {
      contextText = "No relevant documents found in the Knowledge Vault.";
    }

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

    // 4. Generate Answer using Claude 3 on Bedrock
    const systemPrompt = `You are CampusFlow AI, a highly intelligent and friendly student assistant. 
Your goal is to help the student with their academic questions, schedule, and general knowledge.

Below is the student's personal profile and live dashboard context. You must use this context if they ask questions about themselves, their schedule, or their tasks:
<user_profile>
${profileContextStr}
</user_profile>

Below is some context retrieved from the student's own documents in their Knowledge Vault.
If this context is relevant to the user's question, use it to provide a highly accurate and personalized answer.
If the context is NOT relevant to the question, or if the user is just having a general conversation (like "hello" or asking for general advice), feel free to answer using your own general knowledge. You are a conversational AI, so be helpful, polite, and engaging!

<document_context>
${contextText}
</document_context>`;

    const chatCommand = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0', // Extremely fast and cheap
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    });

    const chatResponse = await bedrock.send(chatCommand);
    const chatBody = JSON.parse(new TextDecoder().decode(chatResponse.body));
    const answer = chatBody.content[0].text;

    return NextResponse.json({
      role: 'assistant',
      content: answer,
      sources: sources,
      model: 'CampusFlow-RAG (Bedrock Claude 3)',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
