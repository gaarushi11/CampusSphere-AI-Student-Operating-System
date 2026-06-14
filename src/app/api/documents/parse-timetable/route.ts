import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/utils/supabase/admin';
import { extractTextFromFile } from '@/lib/textExtraction';
import { DAYS_OF_WEEK } from '@/types';

const TIMETABLE_MODEL = process.env.TIMETABLE_LLM_MODEL || 'anthropic/claude-3-haiku-20240307';

const ExtractedClassSchema = z.object({
  title: z.string().min(1).max(120),
  shortCode: z.string().min(1).max(20),
  type: z.enum(['Lecture', 'Lab', 'Tutorial']).default('Lecture'),
  dayOfWeek: z.enum(DAYS_OF_WEEK),
  room: z.string().max(60).default('TBD'),
  instructor: z.string().max(80).default('TBD'),
  startHour: z.number().int().min(0).max(23),
  startMinute: z.number().int().min(0).max(59),
  endHour: z.number().int().min(0).max(23),
  endMinute: z.number().int().min(0).max(59),
});

const ExtractionResultSchema = z.object({
  classes: z.array(ExtractedClassSchema).max(80),
  warnings: z.array(z.string()).default([]),
});

const SYSTEM_PROMPT = `You are a precise data-extraction engine. You convert raw text from college timetables into structured JSON.
Extract every class session found. If a class spans multiple periods, calculate the correct endHour/endMinute.
If the exact room or instructor is not mentioned, use "TBD".
IMPORTANT: Only output valid JSON matching this schema:
{
  "classes": [
    {
      "title": "Operating Systems",
      "shortCode": "CS302",
      "type": "Lecture" | "Lab" | "Tutorial",
      "dayOfWeek": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
      "room": "LT-3",
      "instructor": "Dr. Smith",
      "startHour": 9,
      "startMinute": 0,
      "endHour": 10,
      "endMinute": 0
    }
  ],
  "warnings": ["Any ambiguities or issues you noticed"]
}`;

export async function POST(req: NextRequest) {
  try {
    const { documentId, filePath, userId } = await req.json();

    if (!documentId || !filePath || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Download file
    const { data: fileData, error: downloadError } = await supabase.storage.from('vault_files').download(filePath);
    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const fileExt = filePath.split('.').pop()?.toLowerCase() || '';

    // Extract text
    const { text, warnings } = await extractTextFromFile(buffer, fileExt);

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: 'No readable text found in document. Scanned images are not supported.' }, { status: 422 });
    }

    // Call LLM
    const openRouterKey = process.env.OPEN_ROUTER_API_KEY;
    if (!openRouterKey) {
       return NextResponse.json({ error: 'OPEN_ROUTER_API_KEY is not configured.' }, { status: 500 });
    }

    const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TIMETABLE_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text.slice(0, 15000) }, // Limit text to avoid context limits
        ],
        response_format: { type: "json_object" }
      }),
    });

    const orData = await orResponse.json();
    if (!orResponse.ok || !orData?.choices?.[0]?.message?.content) {
      return NextResponse.json({ error: 'Failed to extract data from LLM' }, { status: 502 });
    }

    let content = orData.choices[0].message.content;
    
    // Attempt to parse JSON safely
    try {
      // Strip markdown code blocks if LLM included them
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(content);
      const validated = ExtractionResultSchema.parse(parsed);
      
      // Merge with text extraction warnings
      validated.warnings = [...validated.warnings, ...warnings];
      
      return NextResponse.json(validated);
    } catch (e: any) {
      console.error('JSON Parsing or Validation Error:', e);
      return NextResponse.json({ error: 'AI returned malformed data', details: e.message }, { status: 422 });
    }

  } catch (error: any) {
    console.error('Timetable Extraction Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
