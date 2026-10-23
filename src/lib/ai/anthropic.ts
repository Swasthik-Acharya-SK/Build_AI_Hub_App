import Anthropic from '@anthropic-ai/sdk';

let cachedClient: Anthropic | null = null;

/**
 * Returns true if ANTHROPIC_API_KEY is present and non-empty.
 */
export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '');
}

/**
 * Returns a singleton Anthropic client initialized with the server-side ANTHROPIC_API_KEY.
 * Never logs or returns the key.
 */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server.');
  }

  if (!cachedClient) {
    cachedClient = new Anthropic({
      apiKey: apiKey.trim(),
    });
  }

  return cachedClient;
}

/**
 * Translates raw Anthropic API errors into safe, human-readable error messages.
 */
export function parseAnthropicError(error: any): { status: number; message: string } {
  const status = error?.status;
  const rawMsg = typeof error?.message === 'string' ? error.message : '';

  // Redact potential API key tokens from unhandled messages
  const sanitizedMsg = rawMsg
    .replace(/sk-[a-zA-Z0-9_\-]{8,}/g, '[REDACTED_API_KEY]')
    .replace(/AIza[a-zA-Z0-9_\-]{8,}/g, '[REDACTED_API_KEY]');

  if (status === 401 || rawMsg.toLowerCase().includes('unauthorized') || rawMsg.includes('sk-ant-')) {
    return {
      status: 401,
      message: 'Invalid Anthropic API key. Please check the ANTHROPIC_API_KEY value configured in your .env.local file.',
    };
  }

  if (error instanceof Anthropic.APIError || typeof status === 'number') {
    switch (status) {
      case 401:
        return {
          status: 401,
          message: 'Invalid Anthropic API key. Please check the ANTHROPIC_API_KEY value configured in your .env.local file.',
        };
      case 403:
        return {
          status: 403,
          message: 'Anthropic access forbidden. Your API key does not have permission for the requested Claude model or region.',
        };
      case 404:
        return {
          status: 404,
          message: 'The requested Claude model was not found or is unavailable for your Anthropic account.',
        };
      case 429:
        return {
          status: 429,
          message: 'Anthropic rate limit reached or usage quota exceeded. Please check your credit balance and tier on console.anthropic.com.',
        };
      case 529:
        return {
          status: 529,
          message: 'Anthropic servers are currently overloaded. Please wait a few seconds and retry.',
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          status: 502,
          message: 'Anthropic servers are temporarily unavailable or experiencing an outage. Please try again shortly.',
        };
      default:
        return {
          status: status || 500,
          message: sanitizedMsg || 'An error occurred while communicating with Anthropic.',
        };
    }
  }

  if (error?.name === 'AbortError' || rawMsg.includes('aborted')) {
    return {
      status: 499,
      message: 'Request was cancelled by user.',
    };
  }

  return {
    status: 500,
    message: sanitizedMsg || 'An unexpected error occurred while communicating with Anthropic Claude.',
  };
}

/**
 * Formats conversation messages strictly adhering to Anthropic Messages API requirements:
 * 1. Top-level system prompt (not in messages array).
 * 2. Alternating user/assistant turns (merges consecutive messages of the same role).
 * 3. First message must be 'user'.
 */
export function prepareAnthropicPayload(
  model: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  systemPrompt?: string,
  temperature = 0.7,
  maxTokens = 8192
): Anthropic.MessageCreateParamsStreaming {

  // Extract any system messages and append to systemPrompt
  const systemParts: string[] = [];
  if (systemPrompt && systemPrompt.trim()) {
    systemParts.push(systemPrompt.trim());
  }

  const normalizedTurns: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      if (msg.content && msg.content.trim()) {
        systemParts.push(msg.content.trim());
      }
    } else {
      const content = msg.content || '';
      if (!content.trim()) continue;

      const role = msg.role === 'assistant' ? 'assistant' : 'user';

      // Merge consecutive turns with the same role
      if (normalizedTurns.length > 0 && normalizedTurns[normalizedTurns.length - 1].role === role) {
        normalizedTurns[normalizedTurns.length - 1].content += `\n\n${content}`;
      } else {
        normalizedTurns.push({ role, content });
      }
    }
  }

  // Ensure first turn is 'user'
  if (normalizedTurns.length === 0 || normalizedTurns[0].role !== 'user') {
    normalizedTurns.unshift({ role: 'user', content: 'Hello' });
  }

  const payload: Anthropic.MessageCreateParamsStreaming = {
    model,
    max_tokens: maxTokens,
    messages: normalizedTurns,
    stream: true,
  };

  if (systemParts.length > 0) {
    payload.system = systemParts.join('\n\n');
  }

  // Anthropic temperature range is 0.0 to 1.0
  payload.temperature = Math.max(0, Math.min(1, temperature));

  return payload;
}
