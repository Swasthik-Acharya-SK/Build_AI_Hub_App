import OpenAI from 'openai';

let cachedClient: OpenAI | null = null;

/**
 * Returns true if the OPENAI_API_KEY environment variable is present and non-empty.
 */
export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '');
}

/**
 * Returns a singleton OpenAI client initialized with the server-side OPENAI_API_KEY.
 * Never logs or returns the key.
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: apiKey.trim(),
    });
  }

  return cachedClient;
}

/**
 * Translates raw API errors into clean, user-friendly error messages
 * without exposing internal server details or sensitive data.
 */
export function parseOpenAIError(error: any): { status: number; message: string } {
  const status = error?.status;
  const rawMsg = typeof error?.message === 'string' ? error.message : '';

  // Redact potential API key tokens from unhandled messages
  const sanitizedMsg = rawMsg
    .replace(/sk-[a-zA-Z0-9_\-]{8,}/g, '[REDACTED_API_KEY]')
    .replace(/AIza[a-zA-Z0-9_\-]{8,}/g, '[REDACTED_API_KEY]');

  if (status === 401 || rawMsg.toLowerCase().includes('incorrect api key') || rawMsg.includes('sk-')) {
    return {
      status: 401,
      message: 'Invalid OpenAI API key. Please check the OPENAI_API_KEY configured in your .env.local file.',
    };
  }

  // If OpenAI APIError or status-bearing error
  if (error instanceof OpenAI.APIError || typeof status === 'number') {
    switch (status) {
      case 401:
        return {
          status: 401,
          message: 'Invalid OpenAI API key. Please check the OPENAI_API_KEY configured in your .env.local file.',
        };
      case 403:
        return {
          status: 403,
          message: 'OpenAI access forbidden. Your API key does not have permission for the requested resource or region.',
        };
      case 404:
        return {
          status: 404,
          message: `The requested OpenAI model was not found or is not accessible with your API account.`,
        };
      case 429:
        if (rawMsg.toLowerCase().includes('quota') || error.code === 'insufficient_quota') {
          return {
            status: 429,
            message: 'OpenAI quota exceeded. Please check your credit balance and billing details on platform.openai.com.',
          };
        }
        return {
          status: 429,
          message: 'OpenAI rate limit exceeded. Please wait a moment before sending another prompt.',
        };
      case 400:
        if (rawMsg.toLowerCase().includes('context_length') || error.code === 'context_length_exceeded') {
          return {
            status: 400,
            message: 'Prompt exceeds the model context window. Please shorten your prompt or start a new conversation.',
          };
        }
        return {
          status: 400,
          message: sanitizedMsg || 'Malformed OpenAI request. Please review prompt parameters.',
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          status: 502,
          message: 'OpenAI servers are temporarily unavailable or experiencing an outage. Please try again shortly.',
        };
      default:
        return {
          status: status || 500,
          message: sanitizedMsg || 'An error occurred while communicating with OpenAI.',
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
    message: sanitizedMsg || 'An unexpected error occurred while communicating with OpenAI.',
  };
}

/**
 * Formats messages for OpenAI Chat Completions, accommodating reasoning models (o1, o3)
 * which prefer developer role instead of system role, and don't accept custom temperature.
 */
export function prepareOpenAIPayload(
  model: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  systemPrompt?: string,
  temperature = 0.7
) {
  const isReasoningModel = model.startsWith('o1') || model.startsWith('o3');

  const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  // Add system/developer prompt if provided
  if (systemPrompt && systemPrompt.trim()) {
    if (isReasoningModel) {
      formattedMessages.push({
        role: 'developer' as any,
        content: systemPrompt.trim(),
      });
    } else {
      formattedMessages.push({
        role: 'system',
        content: systemPrompt.trim(),
      });
    }
  }

  // Add conversation turns
  for (const msg of messages) {
    if (msg.role === 'system') {
      if (isReasoningModel) {
        formattedMessages.push({ role: 'developer' as any, content: msg.content });
      } else {
        formattedMessages.push({ role: 'system', content: msg.content });
      }
    } else if (msg.role === 'assistant') {
      formattedMessages.push({ role: 'assistant', content: msg.content });
    } else {
      formattedMessages.push({ role: 'user', content: msg.content });
    }
  }

  const payload: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
    model,
    messages: formattedMessages,
    stream: true,
  };

  // Reasoning models do not support custom temperature
  if (!isReasoningModel) {
    payload.temperature = Math.max(0, Math.min(2, temperature));
  }

  return payload;
}
