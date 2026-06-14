// src/app/api/chat/route.ts
// CRITICAL FIX: Previous version had literal \` and \${ syntax errors that
// broke the entire endpoint. Rewritten with correct template literals.

import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMockAIResponse } from '@/lib/aiResponses';
import type { Profile, Task, ClassSession, ChatSource } from '@/types';

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

const CHAT_MODEL = process.env.CHAT_LLM_MODEL || 'anthropic/claude-3-haiku-20240307';

async function embedQuery(bedrock: BedrockRuntimeClient, text: string): Promise<number[] | null> {
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
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  query: string,
  limit = 5
): Promise<{ chunks: ChunkResult[]; sources: ChatSource[] }> {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
    'or', 'what', 'my', 'me', 'i', 'how', 'about', 'tell', 'can', 'you', 'are',
    'do', 'does', 'when', 'where', 'this', 'that', 'with',
  ]);
  const keywords = query
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (keywords.length === 0) return { chunks: [], sources: [] };

  const { data: userDocs } = await supabase
    .from('documents')
    .select('id, name, type')
    .eq('user_id', userId)
    .eq('is_indexed', true);

  if (!userDocs || userDocs.length === 0) return { chunks: [], sources: [] };

  const docIds = userDocs.map((d) => d.id);
  const docMap = Object.fromEntries(userDocs.map((d) => [d.id, d]));
  const searchKeyword = keywords.slice(0, 3).join(' ');

  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('id, document_id, content, chunk_index')
    .in('document_id', docIds)
    .ilike('content', `%${searchKeyword}%`)
    .limit(limit);

  let resultChunks = chunks || [];

  if (resultChunks.length === 0) {
    const { data: fallback } = await supabase
      .from('document_chunks')
      .select('id, document_id, content, chunk_index')
      .in('document_id', docIds)
      .order('chunk_index', { ascending: true })
      .limit(limit);
    resultChunks = fallback || [];
  }

  const typedChunks: ChunkResult[] = resultChunks.map((c) => ({ ...c, similarity: 0 }));
  const uniqueDocIds = [...new Set(typedChunks.map((c) => c.document_id))];
  const sources: ChatSource[] = uniqueDocIds.map((docId) => ({
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

    // Build user context string
    let profileContextStr = 'No user profile available.';
    if (context) {
      const pendingTasks = (context.tasks || []).filter((t) => !t.completed);
      profileContextStr = [
        `Student Name: ${context.profile?.name || 'Unknown'}`,
        `Semester: ${context.profile?.semester ?? 'Unknown'}`,
        `Major: ${context.profile?.major || 'Unknown'}`,
        `CGPA: ${context.profile?.cgpa ?? 'Unknown'}`,
        `Hostel Room: ${context.profile?.hostelRoom || 'Unknown'}`,
        '',
        `Their ${pendingTasks.length} pending tasks:`,
        pendingTasks.map((t) => `- [${t.priority}] ${t.title} (Due: ${t.dueDate}, Subject: ${t.subject})`).join('\n') || 'None',
        '',
        "Their classes this week:",
        (context.classes || []).map((c) => `- ${c.dayOfWeek} ${c.time}: ${c.shortCode} ${c.title} in ${c.room} with ${c.instructor} (Attendance: ${c.attendancePercentage}%)`).join('\n') || 'None',
      ].join('\n');
    }

    const supabase = createAdminClient();
    const userId = context?.profile?.id;

    // RAG retrieval
    let contextText = 'No documents found in the Knowledge Vault.';
    let sources: ChatSource[] = [];

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
          const { data: chunks, error: searchError } = await supabase.rpc('match_document_chunks', {
            query_embedding: queryEmbedding,
            match_threshold: 0.35,
            match_count: 6,
            p_user_id: userId,
          });

          if (searchError) {
            console.error('[Chat/RAG] match_document_chunks RPC error:', searchError.message);
            const fallback = await keywordSearch(supabase, userId, message);
            if (fallback.chunks.length > 0) {
              contextText = fallback.chunks.map((c, i) => `[Excerpt ${i + 1}]\n${c.content}`).join('\n\n---\n\n');
              sources = fallback.sources;
            }
          } else if (chunks && (chunks as ChunkResult[]).length > 0) {
            const typedChunks = chunks as ChunkResult[];
            contextText = typedChunks
              .map((c, i) => `[Excerpt ${i + 1} | relevance: ${(c.similarity * 100).toFixed(0)}%]\n${c.content}`)
              .join('\n\n---\n\n');

            const uniqueDocIds = [...new Set(typedChunks.map((c) => c.document_id))];
            const { data: docRows } = await supabase
              .from('documents')
              .select('id, name, type')
              .in('id', uniqueDocIds);

            if (docRows) {
              const docMap = Object.fromEntries(docRows.map((d) => [d.id, d]));
              sources = uniqueDocIds.map((docId) => ({
                title: docMap[docId]?.name || 'Unknown document',
                type: docMap[docId]?.type || 'PDF',
                relevance: typedChunks.find((c) => c.document_id === docId)?.similarity || 0,
              }));
            }
          } else {
            const fallback = await keywordSearch(supabase, userId, message);
            if (fallback.chunks.length > 0) {
              contextText = fallback.chunks.map((c, i) => `[Excerpt ${i + 1} | keyword match]\n${c.content}`).join('\n\n---\n\n');
              sources = fallback.sources;
            } else {
              contextText = 'No content in the Knowledge Vault closely matches this question. Answer from general knowledge.';
            }
          }
        } else {
          const fallback = await keywordSearch(supabase, userId, message);
          if (fallback.chunks.length > 0) {
            contextText = fallback.chunks.map((c, i) => `[Excerpt ${i + 1} | keyword match]\n${c.content}`).join('\n\n---\n\n');
            sources = fallback.sources;
          }
        }
      } else {
        contextText = 'The student has not uploaded any indexed documents to their Knowledge Vault yet.';
      }
    }

    // System prompt
    const systemPrompt = `You are CampusFlow AI, an intelligent, friendly, and accurate assistant for college students.

Your responsibilities, in priority order:
1. Answer using the student's personal context below (profile, schedule, tasks) when the question is about them.
2. Answer using the Knowledge Vault excerpts below when the question relates to uploaded documents (syllabus, notes, slides).
3. Otherwise, answer from general academic/campus knowledge.

FORMATTING:
- Be concise. Use **bold** for key terms and • for bullet points.
- If you use Knowledge Vault content, mention the source naturally (e.g., "Based on your uploaded OS notes...").
- If the Knowledge Vault excerpts are not relevant to the question, say so and answer from general knowledge instead.
- Never invent specific dates, grades, or numbers that aren't in the context provided.

<student_context>
${profileContextStr}
</student_context>

<knowledge_vault_excerpts>
${contextText}
</knowledge_vault_excerpts>`;

    // Generate answer
    const openRouterKey = process.env.OPEN_ROUTER_API_KEY;

    if (!openRouterKey) {
      const { content, sources: mockSources } = getMockAIResponse(message);
      return NextResponse.json({
        role: 'assistant',
        content: `*(Demo mode: OPEN_ROUTER_API_KEY not configured)*\n\n${content}`,
        sources: mockSources ?? [],
        model: 'CampusFlow AI (Demo Mode)',
        timestamp: new Date().toISOString(),
      });
    }

    const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://campusflow.app',
        'X-Title': 'CampusFlow AI Student OS',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 1200,
        temperature: 0.3,
      }),
    });

    const orData = await orResponse.json();

    if (!orResponse.ok || !orData?.choices?.[0]?.message?.content) {
      const errorDetail = orData?.error?.message || JSON.stringify(orData).slice(0, 300);
      console.error('[Chat] OpenRouter error:', orResponse.status, errorDetail);
      return NextResponse.json(
        {
          error: `LLM provider error (${orResponse.status}): ${errorDetail}`,
          hint: 'Check OPEN_ROUTER_API_KEY is valid and has credit at https://openrouter.ai/credits',
        },
        { status: 502 }
      );
    }

    const answer: string = orData.choices[0].message.content;

    return NextResponse.json({
      role: 'assistant',
      content: answer,
      sources,
      model: `CampusFlow AI (${CHAT_MODEL} + Bedrock Titan RAG)`,
      timestamp: new Date().toISOString(),
      ragUsed: sources.length > 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Chat] Fatal error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
