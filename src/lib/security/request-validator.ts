export interface RequestValidationError {
  valid: false;
  status: number;
  message: string;
}

export interface RequestValidationSuccess {
  valid: true;
}

export type RequestValidationResult = RequestValidationSuccess | RequestValidationError;

/**
 * Validates chat request payloads against boundary constraints and malformed input.
 * Protects against prompt overflow DoS and invalid schema attacks.
 */
export function validateChatPayload(payload: any): RequestValidationResult {
  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      status: 400,
      message: 'Invalid request body: expected JSON object.',
    };
  }

  const { provider, model, messages } = payload;
  if (!provider || typeof provider !== 'string' || !model || typeof model !== 'string') {
    return {
      valid: false,
      status: 400,
      message: 'Invalid request: provider and model are required strings.',
    };
  }

  const ALLOWED_PROVIDERS = ['openai', 'anthropic', 'gemini'];
  if (!ALLOWED_PROVIDERS.includes(provider.toLowerCase())) {
    return {
      valid: false,
      status: 400,
      message: `Invalid provider: '${provider}'. Supported providers are: ${ALLOWED_PROVIDERS.join(', ')}.`,
    };
  }

  if (model.length > 100) {
    return {
      valid: false,
      status: 400,
      message: 'Model identifier exceeds maximum permitted length of 100 characters.',
    };
  }

  if (!messages || !Array.isArray(messages)) {
    return {
      valid: false,
      status: 400,
      message: 'Invalid request: messages array is required.',
    };
  }

  if (messages.length === 0) {
    return {
      valid: false,
      status: 400,
      message: 'Prompt content cannot be empty.',
    };
  }

  if (messages.length > 100) {
    return {
      valid: false,
      status: 400,
      message: 'Conversation message limit exceeded (maximum 100 turns). Please start a new conversation.',
    };
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || typeof lastMessage.content !== 'string' || !lastMessage.content.trim()) {
    return {
      valid: false,
      status: 400,
      message: 'Prompt content cannot be empty.',
    };
  }

  if (lastMessage.content.length > 50_000) {
    return {
      valid: false,
      status: 400,
      message: 'Prompt exceeds safe maximum length of 50,000 characters.',
    };
  }

  return { valid: true };
}
