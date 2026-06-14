// src/lib/textExtraction.ts
// SERVER-SIDE ONLY — shared text extraction for PDF, DOCX, PPTX
import { execSync } from 'child_process';
import path from 'path';

export interface ExtractedDocument {
  text: string;
  pageCount: number;
  warnings: string[];
}

const MIN_TEXT_LENGTH = 50;

export async function extractTextFromFile(buffer: Buffer, fileExt: string): Promise<ExtractedDocument> {
  const ext = fileExt.toLowerCase();
  const warnings: string[] = [];

  if (ext === 'pdf') return extractFromPdf(buffer, warnings);
  if (ext === 'docx') return extractFromDocx(buffer, warnings);

  // Unknown type — best-effort plain text decode
  warnings.push(`Unrecognized file extension ".${ext}" — attempting plain-text decode.`);
  const text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
  return { text, pageCount: 1, warnings };
}

async function extractFromPdf(buffer: Buffer, warnings: string[]): Promise<ExtractedDocument> {
  try {
    const workerPath = path.join(process.cwd(), 'src', 'lib', 'pdf-worker.js');
    const stdout = execSync(`node "${workerPath}"`, {
      input: buffer,
      maxBuffer: 50 * 1024 * 1024, // 50MB
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const output = stdout.toString('utf-8');
    const match = output.match(/===RESULT_START===\n([\s\S]*?)\n===RESULT_END===/);
    if (!match) {
      throw new Error("Worker did not return valid JSON tags. Output was: " + output);
    }

    const data = JSON.parse(match[1]);
    const text = data.text;
    
    if (!text || text.trim().length < MIN_TEXT_LENGTH) {
      warnings.push('Very little text was extracted. This PDF may be a scanned image without an OCR text layer.');
    }
    
    return { text, pageCount: data.pageCount || 1, warnings };
  } catch (err: any) {
    const message = err.stderr ? err.stderr.toString('utf-8') : err.message;
    throw new Error(`PDF parsing failed: ${message}`);
  }
}

async function extractFromDocx(buffer: Buffer, warnings: string[]): Promise<ExtractedDocument> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });

    if (result.messages?.length) {
      for (const m of result.messages) {
        if (m.type === 'warning') warnings.push(m.message);
      }
    }

    const wordCount = result.value.split(/\s+/).filter(Boolean).length;
    const estimatedPages = Math.max(1, Math.round(wordCount / 500));

    return { text: result.value, pageCount: estimatedPages, warnings };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`DOCX parsing failed: ${message}`);
  }
}
