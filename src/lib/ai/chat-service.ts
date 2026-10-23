import type { ChatApiRequest } from '../../types/chat';
import { validateChatPayload } from '../security/request-validator';
import { generateMockContent } from './mock';
import {
  getOpenAIClient,
  isOpenAIConfigured,
  parseOpenAIError,
  prepareOpenAIPayload,
} from './openai';
import {
  getAnthropicClient,
  isAnthropicConfigured,
  parseAnthropicError,
  prepareAnthropicPayload,
} from './anthropic';
import {
  getGeminiClient,
  isGeminiConfigured,
  parseGeminiError,
  prepareGeminiPayload,
} from './gemini';

export interface ChatServiceSuccess {
  type: 'stream';
  stream: ReadableStream<Uint8Array>;
  isMock: boolean;
}

export interface ChatServiceError {
  type: 'error';
  status: number;
  message: string;
}

export type ChatServiceResult = ChatServiceSuccess | ChatServiceError;

export async function processChatRequest(
  request: ChatApiRequest,
  signal?: AbortSignal
): Promise<ChatServiceResult> {
  const {
    provider,
    model,
    messages,
    systemPrompt,
    temperature = 0.7,
    mockMode = false,
  } = request;

  // 1. Validate payload structure & boundaries
  const validation = validateChatPayload(request);
  if (!validation.valid) {
    return {
      type: 'error',
      status: validation.status,
      message: validation.message,
    };
  }

  const lastMessage = messages[messages.length - 1];
  const forceMock = process.env.NEXT_PUBLIC_FORCE_MOCK === 'true' || mockMode;

  // 2. Mock Mode handling - strictly separate from live provider requests
  if (forceMock) {
    const mockText = generateMockContent(provider, model, lastMessage.content);
    const words = mockText.split(/(\s+)/);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        await new Promise((res) => setTimeout(res, 80));
        for (const word of words) {
          if (signal?.aborted) break;
          controller.enqueue(encoder.encode(word));
          await new Promise((res) => setTimeout(res, 10 + Math.random() * 15));
        }
        controller.close();
      },
    });

    return {
      type: 'stream',
      stream,
      isMock: true,
    };
  }

  // 3. Live API Mode: OpenAI
  if (provider === 'openai') {
    if (!isOpenAIConfigured()) {
      return {
        type: 'error',
        status: 400,
        message:
          'OpenAI API key is not configured on the server. Please set the OPENAI_API_KEY environment variable in your .env.local file or enable Mock Mode in the header to preview responses.',
      };
    }

    try {
      const openai = getOpenAIClient();
      const payload = prepareOpenAIPayload(model, messages, systemPrompt, temperature);

      const completionStream = await openai.chat.completions.create(payload, {
        signal,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of completionStream) {
              if (signal?.aborted) {
                controller.close();
                return;
              }
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            }
            controller.close();
          } catch (err: any) {
            if (signal?.aborted) {
              controller.close();
              return;
            }
            controller.error(err);
          }
        },
      });

      return {
        type: 'stream',
        stream: readable,
        isMock: false,
      };
    } catch (openAIError: any) {
      const { status, message } = parseOpenAIError(openAIError);
      return {
        type: 'error',
        status,
        message,
      };
    }
  }

  // 4. Live API Mode: Anthropic Claude
  if (provider === 'anthropic') {
    if (!isAnthropicConfigured()) {
      return {
        type: 'error',
        status: 400,
        message:
          'Anthropic API key is not configured on the server. Please set the ANTHROPIC_API_KEY environment variable in your .env.local file or enable Mock Mode in the header to preview responses.',
      };
    }

    try {
      const anthropic = getAnthropicClient();
      const payload = prepareAnthropicPayload(model, messages, systemPrompt, temperature);

      const stream = anthropic.messages.stream(payload, {
        signal,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (signal?.aborted) {
                controller.close();
                return;
              }
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
            controller.close();
          } catch (err: any) {
            if (signal?.aborted) {
              controller.close();
              return;
            }
            controller.error(err);
          }
        },
      });

      return {
        type: 'stream',
        stream: readable,
        isMock: false,
      };
    } catch (anthropicError: any) {
      const { status, message } = parseAnthropicError(anthropicError);
      return {
        type: 'error',
        status,
        message,
      };
    }
  }

  // 5. Live API Mode: Google Gemini
  if (provider === 'gemini') {
    if (!isGeminiConfigured()) {
      return {
        type: 'error',
        status: 400,
        message:
          'Google Gemini API key is not configured on the server. Please set the GEMINI_API_KEY environment variable in your .env.local file or enable Mock Mode in the header to preview responses.',
      };
    }

    try {
      const gemini = getGeminiClient();
      const payload = prepareGeminiPayload(model, messages, systemPrompt, temperature);

      const responseStream = await gemini.models.generateContentStream(payload);

      const encoder = new TextEncoder();
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of responseStream) {
              if (signal?.aborted) {
                controller.close();
                return;
              }
              const text = chunk.text;
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
            controller.close();
          } catch (err: any) {
            if (signal?.aborted) {
              controller.close();
              return;
            }
            controller.error(err);
          }
        },
      });

      return {
        type: 'stream',
        stream: readable,
        isMock: false,
      };
    } catch (geminiError: any) {
      const { status, message } = parseGeminiError(geminiError);
      return {
        type: 'error',
        status,
        message,
      };
    }
  }

  return {
    type: 'error',
    status: 400,
    message: `Unknown provider: ${provider}`,
  };
}
