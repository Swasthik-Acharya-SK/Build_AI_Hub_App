import { NextRequest, NextResponse } from 'next/server';
import { ChatApiRequest } from '@/types/chat';
import { processChatRequest } from '@/lib/ai/chat-service';
import { checkRateLimit } from '@/lib/security/rate-limiter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 1. IP-based Rate Limiting Guardrail
    const rawIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      (req as unknown as { ip?: string }).ip ||
      'anonymous-client';
    const clientIp = rawIp.replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 64) || 'anonymous-client';

    const rateLimit = checkRateLimit(clientIp, 45, 60_000);

    const rateLimitHeaders = {
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': rateLimit.resetAt.toString(),
    };

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error:
            'Too many requests from your IP address. Please slow down and wait a few seconds before trying again.',
        },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders,
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      );
    }

    // 2. Body Payload Parsing
    let body: ChatApiRequest;
    try {
      body = (await req.json()) as ChatApiRequest;
    } catch {
      return NextResponse.json(
        { error: 'Malformed request: Invalid JSON body.' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // 3. Process Request
    const result = await processChatRequest(body, req.signal);

    if (result.type === 'error') {
      return NextResponse.json(
        { error: result.message },
        { status: result.status, headers: rateLimitHeaders }
      );
    }

    return new Response(result.stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Mock-Mode': result.isMock ? 'true' : 'false',
        'Cache-Control': 'no-cache, no-transform',
        ...rateLimitHeaders,
      },
    });
  } catch (error: any) {
    console.error('API /api/chat error:', error);
    return NextResponse.json(
      { error: 'An unexpected internal server error occurred.' },
      { status: 500 }
    );
  }
}
