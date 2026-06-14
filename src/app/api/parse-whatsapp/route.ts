import { NextRequest, NextResponse } from 'next/server';
import { getMockAIResponse } from '@/lib/aiResponses';

const PARSE_MODEL = process.env.CHAT_LLM_MODEL || 'anthropic/claude-3-haiku';

export async function POST(req: NextRequest) {
  try {
    const { text, contextDate } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const openRouterKey = process.env.OPEN_ROUTER_API_KEY;

    // We ask the LLM to strictly return JSON parsing out tasks, events, and attendance changes.
    const systemPrompt = `You are an AI assistant that parses chaotic WhatsApp/Email messages from college students into structured JSON data.

The current date/time is: ${contextDate || new Date().toISOString()}

Analyze the user's message and extract actionable items.
Return ONLY valid JSON matching this schema exactly, nothing else:
{
  "tasks": [
    { "title": "string", "description": "string", "subject": "string", "dueDate": "ISO 8601 string", "priority": "High" | "Medium" | "Low" }
  ],
  "events": [
    { "title": "string", "description": "string", "eventDate": "ISO 8601 string", "location": "string", "category": "Academic" | "Club" | "Sports" | "Social" | "Other" }
  ],
  "attendance": [
    { "shortCode": "string (e.g. CS101)", "date": "YYYY-MM-DD", "status": "Cancelled" | "Present" | "Absent" }
  ],
  "summary": "A 1-sentence summary of what you extracted."
}

Rules:
1. If a class is cancelled, moved, or extra, add it to 'attendance' or 'events'.
2. If an assignment/quiz is announced, add it to 'tasks'.
3. If a club meeting or fest is announced, add it to 'events'.
4. Ensure all dates are valid ISO strings in the future based on the current date. Guess the year/month if omitted.
5. If nothing is found for a category, return an empty array [].
6. Do NOT include markdown blocks like \`\`\`json. Return raw JSON string.`;

    if (!openRouterKey) {
      // Mock response for testing without API key
      return NextResponse.json({
        tasks: [
          {
            title: 'Mock Assignment Extracted',
            description: 'This is a mock response because OPEN_ROUTER_API_KEY is missing.',
            subject: 'CS',
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            priority: 'High'
          }
        ],
        events: [],
        attendance: [],
        summary: 'Mock extraction successful.'
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
        model: PARSE_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        max_tokens: 1000,
        temperature: 0.1, // Low temp for structured extraction
      }),
    });

    const orData = await orResponse.json();

    if (!orResponse.ok || !orData?.choices?.[0]?.message?.content) {
      const errorDetail = orData?.error?.message || 'Unknown OpenRouter error';
      console.error('[WhatsApp Parse] Error:', errorDetail);
      return NextResponse.json({ error: errorDetail }, { status: 502 });
    }

    let answerStr = orData.choices[0].message.content.trim();
    // Clean up potential markdown formatting
    if (answerStr.startsWith('\`\`\`json')) {
      answerStr = answerStr.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (answerStr.startsWith('\`\`\`')) {
      answerStr = answerStr.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    try {
      const parsed = JSON.parse(answerStr);
      return NextResponse.json(parsed);
    } catch (parseErr) {
      console.error('[WhatsApp Parse] JSON Parse Error. Raw response:', answerStr);
      return NextResponse.json({ error: 'AI returned invalid format' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[WhatsApp Parse] Fatal error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
