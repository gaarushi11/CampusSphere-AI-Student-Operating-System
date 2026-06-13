import { NextRequest, NextResponse } from 'next/server';
import { getMockAIResponse } from '@/lib/aiResponses';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body as { message: string };

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Simulate network latency (800ms–1500ms)
    await new Promise((resolve) =>
      setTimeout(resolve, 800 + Math.random() * 700)
    );

    // In production, this would be replaced with:
    // const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
    // const command = new InvokeModelCommand({
    //   modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    //   body: JSON.stringify({
    //     anthropic_version: 'bedrock-2023-05-31',
    //     max_tokens: 1024,
    //     messages: [{ role: 'user', content: message }],
    //     system: 'You are CampusFlow AI, an intelligent campus assistant...'
    //   })
    // });
    // const response = await bedrock.send(command);

    const { content, sources } = getMockAIResponse(message);

    return NextResponse.json({
      role: 'assistant',
      content,
      sources: sources ?? [],
      model: 'CampusFlow-RAG-v1 (Amazon Bedrock simulation)',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
