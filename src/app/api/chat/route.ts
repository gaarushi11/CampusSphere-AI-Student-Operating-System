import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMockAIResponse } from '@/lib/aiResponses';
import type { Profile, Task, ClassSession } from '@/types';

interface RequestContext {
  profile?: Profile;
  tasks?: Task[];
  classes?: ClassSession[];
}

interface ChunkResult {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  similarity: number;
}

interface DocumentSource {
  title: string;
  type: string;
  relevance: number;
}

async function embedQuery(
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
    console.warn('[Chat/Embed] Bedrock embedding failed:', message);
    return null;
  }
}

async function keywordSearch(
  supabase: ReturnType<typeof import('@/utils/supabase/admin').createAdminClient>,
  userId: string,
  query: string,
  limit = 5
): Promise<{ chunks: ChunkResult[]; sources: DocumentSource[] }> {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'what', 'my', 'me', 'i', 'how', 'about', 'tell', 'can', 'you']);
  const keywords = query
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  if (keywords.length === 0) {
    return { chunks: [], sources: [] };
  }

  const { data: userDocs } = await supabase
    .from('documents')
    .select('id, name, type')
    .eq('user_id', userId)
    .eq('is_indexed', true);

  if (!userDocs || userDocs.length === 0) {
    return { chunks: [], sources: [] };
  }

  const docIds = userDocs.map(d => d.id);
  const docMap = Object.fromEntries(userDocs.map(d => [d.id, d]));

  const searchKeyword = keywords.slice(0, 3).join(' ');

  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('id, document_id, content, chunk_index')
    .in('document_id', docIds)
    .ilike('content', `%${searchKeyword}%`)
    .limit(limit);

  if (!chunks || chunks.length === 0) {
    const { data: fallback } = await supabase
      .from('document_chunks')
      .select('id, document_id, content, chunk_index')
      .in('document_id', docIds)
      .order('chunk_index', { ascending: true })
      .limit(limit);

    const fbChunks = (fallback || []).map(c => ({ ...c, similarity: 0 }));
    const fbSources = [...new Set(fbChunks.map(c => c.document_id))]
      .map(docId => ({
        title: docMap[docId]?.name || 'Unknown',
        type: docMap[docId]?.type || 'PDF',
        relevance: 0,
      }));

    return { chunks: fbChunks, sources: fbSources };
  }

  const typedChunks: ChunkResult[] = chunks.map(c => ({ ...c, similarity: 0 }));
  const uniqueDocIds = [...new Set(typedChunks.map(c => c.document_id))];
  const sources: DocumentSource[] = uniqueDocIds.map(docId => ({
    title: docMap[docId]?.name || 'Unknown',
    type: docMap[docId]?.type || 'PDF',
    relevance: 0,
  }));

  return { chunks: typedChunks, sources };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, context } = body as { message: string; context?: RequestContext };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let profileContextStr = 'No user profile available.';
    if (context) {
      const pendingTasks = (context.tasks || []).filter(t => !t.completed);
      profileContextStr = `
Student Name: ${context.profile?.name || 'Unknown'}
Semester: ${context.profile?.semester || 'Unknown'}
Major: ${context.profile?.major || 'Unknown'}
CGPA: ${context.profile?.cgpa || 'Unknown'}
Hostel Room: ${context.profile?.hostelRoom || 'Unknown'}

Their ${pendingTasks.length} pending tasks:
${pendingTasks.map(t => `- [${t.priority}] ${t.title} (Due: ${t.dueDate}, Subject: ${t.subject})`).join('\n') || 'None'}

Their today's classes:
${(context.classes || []).map(c => `- ${c.shortCode}: ${c.title} at ${c.time} in ${c.room} (Attendance: ${c.attendancePercentage}%)`).join('\n') || 'None'}
`.trim();
    }

    const supabase = createAdminClient();
    const userId = context?.profile?.id;

    let contextText = 'No documents found in the Knowledge Vault.';
    let sources: DocumentSource[] = [];

    if (userId) {
      const { count: docCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_indexed', true);

      if (docCount && docCount > 0) {
        const bedrock = new BedrockRuntimeClient({
          region: process.env.AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          },
        });

        const queryEmbedding = await embedQuery(bedrock, message);

        if (queryEmbedding) {
          const { data: chunks, error: searchError } = await supabase.rpc(
            'match_document_chunks',
            {
              query_embedding: queryEmbedding,
              match_threshold: 0.4,
              match_count: 6,
              p_user_id: userId,
            }
          );

          if (searchError) {
            console.error('[Chat/RAG] match_document_chunks RPC error:', searchError.message);
          } else if (chunks && (chunks as ChunkResult[]).length > 0) {
            const typedChunks = chunks as ChunkResult[];
            contextText = typedChunks
              .map((c, i) => `[Chunk ${i + 1} | similarity: ${c.similarity.toFixed(3)}]\n${c.content}`)
              .join('\n\n---\n\n');

            const uniqueDocIds = [...new Set(typedChunks.map(c => c.document_id))];
            const { data: docRows } = await supabase
              .from('documents')
              .select('id, name, type')
              .in('id', uniqueDocIds);

            if (docRows) {
              const docMap = Object.fromEntries(docRows.map(d => [d.id, d]));
              sources = uniqueDocIds.map(docId => ({
                title: docMap[docId]?.name || 'Unknown document',
                type: docMap[docId]?.type || 'PDF',
                relevance: typedChunks.find(c => c.document_id === docId)?.similarity || 0,
              }));
            }
          } else {
            const fallback = await keywordSearch(supabase, userId, message);
            if (fallback.chunks.length > 0) {
              contextText = fallback.chunks
                .map((c, i) => `[Chunk ${i + 1} | keyword match]\n${c.content}`)
                .join('\n\n---\n\n');
              sources = fallback.sources;
            } else {
              contextText = 'No relevant content found in your Knowledge Vault for this query. I will answer from general knowledge.';
            }
          }
        } else {
          const fallback = await keywordSearch(supabase, userId, message);
          if (fallback.chunks.length > 0) {
            contextText = fallback.chunks
              .map((c, i) => `[Chunk ${i + 1} | keyword match]\n${c.content}`)
              .join('\n\n---\n\n');
            sources = fallback.sources;
          }
        }
      } else {
        contextText = 'The student has not uploaded any documents to their Knowledge Vault yet.';
      }
    }

    const systemPrompt = `You are CampusFlow AI, a highly intelligent, friendly, and accurate AI assistant for college students.

Your core responsibilities:
1. Answer questions using the student's personal context (profile, schedule, tasks)
2. Answer document-related questions using the retrieved Knowledge Vault chunks
3. Give general academic and campus life guidance when no specific context is available

IMPORTANT RULES:
- Be concise and helpful. Use markdown formatting: **bold** for emphasis, bullet points with •
- If the document context is provided and relevant, cite it naturally ("Based on your uploaded OS notes...")
- If the document context is NOT relevant to the question, answer from general knowledge and say so
- Never make up specific exam dates, grades, or facts that aren't in the context
- If asked about attendance, use the exact numbers from the user profile

<user_context>
${profileContextStr}
</user_context>

<knowledge_vault_context>
${contextText}
</knowledge_vault_context>`;

    const openRouterKey = process.env.OPEN_ROUTER_API_KEY;

    if (!openRouterKey) {
      console.warn('[Chat] No OPEN_ROUTER_API_KEY. Falling back to local mock responses.');
      const { content, sources: mockSources } = getMockAIResponse(message);
      return NextResponse.json({
        role: 'assistant',
        content: \`*(System Offline: OpenRouter key missing)*\n\n\${content}\`,
        sources: mockSources ?? [],
        model: 'CampusFlow AI (Fallback)',
        timestamp: new Date().toISOString(),
      });
    }

    const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${openRouterKey}\`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "anthropic/claude-3-haiku-20240307",
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

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
