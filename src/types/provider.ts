export type ProviderId = 'openai' | 'anthropic' | 'gemini';

export interface ModelPricing {
  inputPer1M: number;  // USD per 1M prompt tokens
  outputPer1M: number; // USD per 1M completion tokens
}

export interface ModelMeta {
  id: string;
  name: string;
  provider: ProviderId;
  description: string;
  badge?: string;
  contextWindow: number;
  maxOutputTokens: number;
  pricing: ModelPricing;
  supportsStreaming: boolean;
  recommended?: boolean;
}

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  company: string;
  icon: string;
  accentColor: string;
  bgColor: string;
  apiKeyEnvVar: string;
  keyUrl: string;
  models: ModelMeta[];
}

export interface ProviderStatus {
  provider: ProviderId;
  configured: boolean;
  usingCustomKey: boolean;
  activeModelCount: number;
}
