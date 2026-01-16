import OpenAI from 'openai';
import { DEFAULT_MODEL } from '@/lib/models';

export const dynamic = 'force-dynamic';

type StreamRequestBody = {
    model?: string;
    system?: string;
    prompt: string;
    temperature?: number;
};

export async function POST(req: Request) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return new Response('Server misconfigured: missing OPENAI_API_KEY', { status: 500 });
    }

    let body: StreamRequestBody;
    try {
        body = (await req.json()) as StreamRequestBody;
    } catch {
        return new Response('Invalid JSON body', { status: 400 });
    }

    const model = body.model ?? DEFAULT_MODEL;
    const system = body.system ?? '';
    const prompt = body.prompt;
    const temperatureRaw = body.temperature ?? 0.7;
    const temperature = Number.isFinite(temperatureRaw)
        ? Math.min(2, Math.max(0, temperatureRaw))
        : 0.7;

    if (!prompt || typeof prompt !== 'string') {
        return new Response('Missing `prompt`', { status: 400 });
    }

    const openai = new OpenAI({ apiKey });
    const encoder = new TextEncoder();

    // Chat Completions streaming: stable + easy to forward as plain text.
    const completionStream = await openai.chat.completions.create({
        model,
        temperature,
        stream: true,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
        ],
    });

    const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
            try {
                for await (const chunk of completionStream) {
                    const delta = chunk.choices?.[0]?.delta?.content;
                    if (delta) controller.enqueue(encoder.encode(delta));
                }
                controller.close();
            } catch (err) {
                controller.error(err);
            }
        },
    });

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
        },
    });
}

