import OpenAI from 'openai';
import { DEFAULT_MODEL } from '@/lib/models';

export const dynamic = 'force-dynamic';

type StreamRequestBody = {
    model?: string;
    system?: string;
    prompt: string;
    temperature?: number;
    // Optional controls (used for deterministic generation in some constraints).
    // Kept optional for backward compatibility.
    maxTokens?: number;
    stop?: string[];
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

    const maxTokensRaw = body.maxTokens;
    const maxTokens =
        typeof maxTokensRaw === 'number' && Number.isFinite(maxTokensRaw)
            ? Math.min(512, Math.max(1, Math.floor(maxTokensRaw)))
            : undefined;

    // OpenAI enforces a small max size on `stop`.
    const stop = Array.isArray(body.stop) && body.stop.every((x) => typeof x === 'string')
        ? body.stop.slice(0, 4)
        : undefined;

    const openai = new OpenAI({ apiKey });
    const encoder = new TextEncoder();

    const throttleMsRaw = process.env.OPENAI_STREAM_THROTTLE_MS;
    const throttleMs = throttleMsRaw ? Number(throttleMsRaw) : 0;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Chat Completions streaming: stable + easy to forward as plain text.
    let completionStream: Awaited<ReturnType<typeof openai.chat.completions.create>>;
    try {
        completionStream = await openai.chat.completions.create({
            model,
            temperature,
            max_tokens: maxTokens,
            stop,
            stream: true,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: prompt },
            ],
        });
    } catch (e) {
        // Avoid throwing raw errors (which become opaque 500s).
        const msg = e instanceof Error ? e.message : 'OpenAI request failed';
        return new Response(msg, { status: 500 });
    }

    const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
            try {
                for await (const chunk of completionStream) {
                    const delta = chunk.choices?.[0]?.delta?.content;
                    if (delta) {
                        controller.enqueue(encoder.encode(delta));
                        // Optional throttling to make streaming visually observable while debugging.
                        if (throttleMs && Number.isFinite(throttleMs) && throttleMs > 0) {
                            await sleep(Math.min(200, Math.max(0, throttleMs)));
                        }
                    }
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
