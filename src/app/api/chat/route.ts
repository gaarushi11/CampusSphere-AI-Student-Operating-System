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
  expenses?: any[];
  budgetGoals?: any[];
  wellnessLogs?: any[];
}

interface ChunkResult {
  id: string;
  document_id: string;
  content: string;
  similarity: number;
}

const CHAT_MODEL = process.env.CHAT_LLM_MODEL || 'anthropic/claude-3-haiku';

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
        '',
        "Their finances this month:",
        (context.expenses || []).length > 0 ? `Total spent: ₹${context.expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0}` : 'No expenses logged.',
        "Budget limits:",
        (context.budgetGoals || []).map(b => `- ${b.category}: ₹${b.monthlyLimit}`).join('\n') || 'None set.',
        '',
        "Recent Wellness logs:",
        (context.wellnessLogs || []).slice(0,3).map(w => `- Date: ${w.date}, Mood: ${w.mood}, Stress: ${w.stressLevel}/5, Sleep: ${w.sleepHours}h`).join('\n') || 'No logs.',
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
          // Cascading RPC: try hybrid_document_search first, then match_document_chunks
          let chunks: ChunkResult[] | null = null;
          let searchError: { message: string } | null = null;

          // Try 1: Hybrid Search (Vector + Full-Text Keyword fusion)
          const hybridResult = await supabase.rpc('hybrid_document_search', {
            query_text: message,
            query_embedding: queryEmbedding,
            match_count: 8,
            p_user_id: userId,
          });

          if (!hybridResult.error && hybridResult.data) {
            chunks = hybridResult.data as ChunkResult[];
            console.log(`[Chat/RAG] Hybrid search returned ${chunks.length} chunks`);
          } else {
            console.warn('[Chat/RAG] hybrid_document_search failed, trying match_document_chunks:', hybridResult.error?.message);
            // Try 2: Plain vector search RPC
            const vectorResult = await supabase.rpc('match_document_chunks', {
              query_embedding: queryEmbedding,
              match_threshold: 0.10,
              match_count: 8,
              p_user_id: userId,
            });

            if (!vectorResult.error && vectorResult.data) {
              chunks = vectorResult.data as ChunkResult[];
              console.log(`[Chat/RAG] match_document_chunks returned ${chunks.length} chunks`);
            } else {
              searchError = vectorResult.error;
              console.warn('[Chat/RAG] match_document_chunks also failed:', vectorResult.error?.message);
            }
          }

          if (searchError || !chunks) {
            console.warn('[Chat/RAG] RPC failed, falling back to JS vector search:', searchError?.message);
            // JS fallback vector search
            const { data: userDocs } = await supabase
              .from('documents')
              .select('id, name, type')
              .eq('user_id', userId)
              .eq('is_indexed', true);
            
            const userDocIds = userDocs ? userDocs.map(d => d.id) : [];
            const docMap = userDocs ? Object.fromEntries(userDocs.map(d => [d.id, d])) : {};

            const { data: allChunks } = await supabase
              .from('document_chunks')
              .select('id, document_id, content, embedding')
              .in('document_id', userDocIds);
            
            let bestChunks: ChunkResult[] = [];
            
            if (allChunks && allChunks.length > 0) {
              const dotProduct = (a: number[], b: number[]) => a.reduce((sum, val, i) => sum + val * b[i], 0);
              const magnitude = (v: number[]) => Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
              const cosineSimilarity = (a: number[], b: number[]) => {
                const magA = magnitude(a);
                const magB = magnitude(b);
                if (magA === 0 || magB === 0) return 0;
                return dotProduct(a, b) / (magA * magB);
              };

              const parsedChunks = allChunks
                .filter(c => c.embedding)
                .map(c => {
                  let emb: number[];
                  try {
                    emb = typeof c.embedding === 'string' ? JSON.parse(c.embedding) : c.embedding;
                  } catch (e) {
                    return null;
                  }
                  if (!Array.isArray(emb)) return null;
                  return {
                    id: c.id,
                    document_id: c.document_id,
                    content: c.content,
                    similarity: cosineSimilarity(queryEmbedding, emb)
                  };
                })
                .filter(c => c !== null) as ChunkResult[];

              bestChunks = parsedChunks
                .filter(c => c.similarity > 0.15)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 6);
            }

            if (bestChunks.length > 0) {
              contextText = bestChunks.map((c, i) => `[Excerpt ${i + 1} from Document: ${docMap[c.document_id]?.name || 'Unknown'} | relevance: ${(c.similarity * 100).toFixed(0)}%]\n${c.content}`).join('\n\n---\n\n');
              const uniqueDocIds = [...new Set(bestChunks.map(c => c.document_id))];
              sources = uniqueDocIds.map(docId => ({
                title: docMap[docId]?.name || 'Unknown',
                type: docMap[docId]?.type || 'PDF',
                relevance: bestChunks.find(c => c.document_id === docId)?.similarity || 0,
              }));
            } else {
              contextText = 'No content in the Knowledge Vault closely matches this question. Answer from general knowledge.';
            }
          } else if (chunks && (chunks as ChunkResult[]).length > 0) {
            const typedChunks = chunks as ChunkResult[];
            const uniqueDocIds = [...new Set(typedChunks.map((c) => c.document_id))];
            const { data: docRows } = await supabase
              .from('documents')
              .select('id, name, type')
              .in('id', uniqueDocIds);
            
            let docMap: Record<string, any> = {};
            if (docRows) {
              docMap = Object.fromEntries(docRows.map((d) => [d.id, d]));
            }

            contextText = typedChunks
              .map((c, i) => `[Excerpt ${i + 1} from Document: ${docMap[c.document_id]?.name || 'Unknown'} | relevance: ${(c.similarity * 100).toFixed(0)}%]\n${c.content}`)
              .join('\n\n---\n\n');

            if (docRows) {
              sources = uniqueDocIds.map((docId) => ({
                title: docMap[docId]?.name || 'Unknown document',
                type: docMap[docId]?.type || 'PDF',
                relevance: typedChunks.find((c) => c.document_id === docId)?.similarity || 0,
              }));
            }
          } else {
            contextText = 'No content in the Knowledge Vault closely matches this question. Answer from general knowledge.';
          }
        } else {
          contextText = 'No content in the Knowledge Vault closely matches this question. Answer from general knowledge.';
        }
      } else {
        contextText = 'The student has not uploaded any indexed documents to their Knowledge Vault yet.';
      }

      // FULL DOCUMENT OVERRIDE
      // When the user asks for a summary, abstract, authors, introduction, or conclusion,
      // we need the ENTIRE document, not just the top 6-8 semantic chunks.
      const lowerMsg = message.toLowerCase();
      const needsFullDoc = ['summarize', 'summary', 'abstract', 'author', 'authors', 'introduction', 'conclusion', 'overview', 'full paper', 'entire paper', 'whole paper'].some(kw => lowerMsg.includes(kw));

      if (needsFullDoc && sources.length > 0) {
        const topDocTitle = sources[0].title;
        const { data: fullDocs } = await supabase
          .from('documents')
          .select('id')
          .eq('user_id', userId)
          .eq('name', topDocTitle);
        
        if (fullDocs && fullDocs.length > 0) {
          const topDocId = fullDocs[0].id;
          const { data: allDocChunks } = await supabase
            .from('document_chunks')
            .select('content')
            .eq('document_id', topDocId)
            .limit(60);

          if (allDocChunks && allDocChunks.length > 0) {
            contextText = allDocChunks.map((c, i) => `[Page/Chunk ${i + 1} of Document: ${topDocTitle}]\n${c.content}`).join('\n\n---\n\n');
            console.log(`[Chat/RAG] Full-doc override: injected ${allDocChunks.length} chunks for "${topDocTitle}"`);
          }
        }
      } else if (needsFullDoc && sources.length === 0 && userId) {
        // User asked about abstract/author but RAG didn't match anything.
        // Grab the most recently uploaded document and inject its full content.
        const { data: recentDoc } = await supabase
          .from('documents')
          .select('id, name')
          .eq('user_id', userId)
          .eq('is_indexed', true)
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .single();

        if (recentDoc) {
          const { data: allDocChunks } = await supabase
            .from('document_chunks')
            .select('content')
            .eq('document_id', recentDoc.id)
            .limit(60);

          if (allDocChunks && allDocChunks.length > 0) {
            contextText = allDocChunks.map((c, i) => `[Page/Chunk ${i + 1} of Document: ${recentDoc.name}]\n${c.content}`).join('\n\n---\n\n');
            sources = [{ title: recentDoc.name, type: 'PDF', relevance: 1.0 }];
            console.log(`[Chat/RAG] Full-doc fallback: injected ${allDocChunks.length} chunks for most recent doc "${recentDoc.name}"`);
          }
        }
      }
    }

    let uploadedDocsList = '';
    if (userId) {
      const { data: userDocs } = await supabase
        .from('documents')
        .select('name, type')
        .eq('user_id', userId)
        .eq('is_indexed', true);
      if (userDocs && userDocs.length > 0) {
        uploadedDocsList = userDocs.map(d => `- ${d.name} (${d.type})`).join('\n');
      }
    }

    // System prompt
    const systemPrompt = `You are CampusFlow AI, an intelligent, friendly, and accurate assistant for college students.

Your responsibilities, in priority order:
1. Answer using the student's personal context below (profile, schedule, tasks) when the question is about them.
2. Answer using the Knowledge Vault content below when the question relates to uploaded documents.
3. Otherwise, answer from general academic/campus knowledge.

CRITICAL RULES — YOU MUST FOLLOW THESE:
- The <knowledge_vault_content> section below contains the ACTUAL TEXT extracted from the student's uploaded PDF/DOCX files. This IS the document content. You have FULL ACCESS to it.
- IMPORTANT: PDF text extraction sometimes reorders text (columns may be interleaved, headers mixed with body text). You must still read through it carefully and extract the requested information.
- NEVER say "I don't have access", "the excerpts don't contain", "without access to the full paper", or similar disclaimers. The text below IS the paper.
- When the student asks for author names, look for names near institutional affiliations, email addresses, or the title of the paper. Author names in academic papers appear on the first page near the title.
- When the student asks for the abstract, look for the word "Abstract" or "ABSTRACT" or look for the introductory paragraph that summarizes the paper, typically on page 1.
- If you find partial or garbled information, present what you CAN find rather than saying nothing is available.
- You MUST answer from the content provided. Extract and synthesize information even if the text formatting is imperfect.

FORMATTING:
- Be concise. Use **bold** for key terms and • for bullet points.
- Mention the source document naturally (e.g., "Based on your uploaded paper...").
- Never invent specific dates, grades, or numbers that aren't in the content provided.

<student_context>
${profileContextStr}
</student_context>

<available_documents>
The student has uploaded the following documents to their Knowledge Vault:
${uploadedDocsList || 'None'}
</available_documents>

<knowledge_vault_content>
${contextText}
</knowledge_vault_content>`;

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
        max_tokens: 2000,
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
