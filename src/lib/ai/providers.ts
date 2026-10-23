import { ProviderId, ProviderMeta, ModelMeta } from '@/types/provider';

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    company: 'OpenAI',
    icon: 'Sparkles',
    accentColor: '#10a37f',
    bgColor: 'rgba(16, 163, 127, 0.1)',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        description: 'Omni flagship model for complex multimodal and coding tasks.',
        badge: 'Flagship',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        pricing: { inputPer1M: 2.50, outputPer1M: 10.00 },
        supportsStreaming: true,
        recommended: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Affordable, low-latency model for fast everyday tasks.',
        badge: 'Fast & Efficient',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        pricing: { inputPer1M: 0.15, outputPer1M: 0.60 },
        supportsStreaming: true,
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        provider: 'openai',
        description: 'Advanced reasoning model optimized for science, math, and code.',
        badge: 'Deep Reasoning',
        contextWindow: 200000,
        maxOutputTokens: 100000,
        pricing: { inputPer1M: 1.10, outputPer1M: 4.40 },
        supportsStreaming: true,
      },
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    company: 'Anthropic',
    icon: 'Bot',
    accentColor: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.1)',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        description: 'Industry-leading benchmark in coding, writing, and multi-step agents.',
        badge: 'Flagship',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        pricing: { inputPer1M: 3.00, outputPer1M: 15.00 },
        supportsStreaming: true,
        recommended: true,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        description: 'Blazing fast intelligence suited for immediate responses and utilities.',
        badge: 'Ultra Fast',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        pricing: { inputPer1M: 0.80, outputPer1M: 4.00 },
        supportsStreaming: true,
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        description: 'Deep narrative and nuanced prose analysis for highly complex dilemmas.',
        badge: 'Nuance & Depth',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        pricing: { inputPer1M: 15.00, outputPer1M: 75.00 },
        supportsStreaming: true,
      },
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    company: 'Google',
    icon: 'Zap',
    accentColor: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    apiKeyEnvVar: 'GEMINI_API_KEY',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'gemini',
        description: 'Frontier 2-million token context model for massive codebases and data.',
        badge: '2M Context',
        contextWindow: 2000000,
        maxOutputTokens: 8192,
        pricing: { inputPer1M: 1.25, outputPer1M: 5.00 },
        supportsStreaming: true,
        recommended: true,
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'gemini',
        description: 'Super lightweight and high-throughput model built for speed and economy.',
        badge: 'High Speed',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        pricing: { inputPer1M: 0.075, outputPer1M: 0.30 },
        supportsStreaming: true,
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'gemini',
        description: 'Next-generation frontier speed, low latency, and enhanced real-time capabilities.',
        badge: 'Next Gen',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        pricing: { inputPer1M: 0.10, outputPer1M: 0.40 },
        supportsStreaming: true,
      },
    ],
  },
};

export const ALL_MODELS: ModelMeta[] = Object.values(PROVIDERS).flatMap(
  (p) => p.models
);

export function getModelById(modelId: string): ModelMeta | undefined {
  if (modelId === 'gemini-2.0-flash-exp') {
    return ALL_MODELS.find((m) => m.id === 'gemini-2.0-flash');
  }
  return ALL_MODELS.find((m) => m.id === modelId);
}

export function calculateEstimatedCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  const model = getModelById(modelId);
  if (!model) return 0;
  const inputCost = (promptTokens / 1_000_000) * model.pricing.inputPer1M;
  const outputCost = (completionTokens / 1_000_000) * model.pricing.outputPer1M;
  return Number((inputCost + outputCost).toFixed(6));
}
