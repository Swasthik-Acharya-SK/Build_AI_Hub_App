import { GoogleGenAI } from '@google/genai';

let cachedClient: GoogleGenAI | null = null;

/**
 * Returns true if GEMINI_API_KEY is present and non-empty.
 */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
}

/**
 * Returns a singleton GoogleGenAI client initialized with the server-side GEMINI_API_KEY.
 * Never logs or returns the key.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
    });
  }

  return cachedClient;
}

/**
 * Translates raw Gemini / Google Gen AI errors into safe, human-readable error messages.
 */
export function parseGeminiError(error: any): { status: number; message: string } {
  const errMessage = String(error?.message || '').toLowerCase();
  const status = error?.status || error?.statusCode;

  // 1. User cancellation
  if (error?.name === 'AbortError' || errMessage.includes('aborted') || errMessage.includes('cancelled')) {
    return {
      status: 499,
      message: 'Request was cancelled by user.',
    };
  }

  // 2. Authentication error
  if (
    status === 400 ||
    status === 401 ||
    errMessage.includes('api key not valid') ||
    errMessage.includes('invalid api key') ||
    errMessage.includes('api_key_invalid')
  ) {
    return {
      status: 401,
      message: 'Invalid Google Gemini API key. Please check the GEMINI_API_KEY value configured in your .env.local file.',
    };
  }

  // 3. Permission denied
  if (status === 403 || errMessage.includes('permission_denied') || errMessage.includes('permission denied')) {
    return {
      status: 403,
      message: 'Google Gemini access forbidden. Ensure the Generative Language API is enabled for your project on aistudio.google.com.',
    };
  }

  // 4. Model not found
  if (status === 404 || errMessage.includes('not found') || errMessage.includes('models/')) {
    return {
      status: 404,
      message: 'The requested Gemini model was not found or is unavailable for your account.',
    };
  }

  // 5. Quota / Rate limits
  if (
    status === 429 ||
    errMessage.includes('resource_exhausted') ||
    errMessage.includes('quota') ||
    errMessage.includes('rate limit')
  ) {
    return {
      status: 429,
      message: 'Google Gemini quota exceeded or rate limit reached. Please check your project quota at aistudio.google.com.',
    };
  }

  // 6. Upstream outage / unavailable
  if (status === 503 || errMessage.includes('unavailable') || errMessage.includes('overloaded')) {
    return {
      status: 502,
      message: 'Google Gemini service is temporarily unavailable. Please retry in a moment.',
    };
  }

  return {
    status: status || 500,
    message: error?.message || 'An unexpected error occurred while communicating with Google Gemini.',
  };
}

/**
 * Formats conversation history for Google Gen AI:
 * Converts roles to 'user' or 'model' (Gemini expects 'model' for assistant).
 * Extracts system prompts for config.systemInstruction.
 */
export function prepareGeminiPayload(
  model: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  systemPrompt?: string,
  temperature = 0.7,
  maxOutputTokens = 8192
) {

  const systemParts: string[] = [];
  if (systemPrompt && systemPrompt.trim()) {
    systemParts.push(systemPrompt.trim());
  }

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      if (msg.content && msg.content.trim()) {
        systemParts.push(msg.content.trim());
      }
    } else {
      const content = msg.content || '';
      if (!content.trim()) continue;

      const role = msg.role === 'assistant' ? 'model' : 'user';

      // Merge consecutive turns with the same role
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n\n${content}`;
      } else {
        contents.push({
          role,
          parts: [{ text: content }],
        });
      }
    }
  }

  // Ensure there is at least one turn and first turn is user
  if (contents.length === 0 || contents[0].role !== 'user') {
    contents.unshift({
      role: 'user',
      parts: [{ text: 'Hello' }],
    });
  }

  // Map model identifier if needed
  let actualModel = model;
  if (model === 'gemini-2.0-flash-exp') {
    actualModel = 'gemini-2.0-flash-exp';
  } else if (model === 'gemini-2.0-flash') {
    actualModel = 'gemini-2.0-flash';
  }

  const config: {
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
  } = {
    temperature: Math.max(0, Math.min(2, temperature)),
    maxOutputTokens,
  };

  if (systemParts.length > 0) {
    config.systemInstruction = systemParts.join('\n\n');
  }

  return {
    model: actualModel,
    contents,
    config,
  };
}
