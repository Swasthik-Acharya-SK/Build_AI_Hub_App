import { ProviderId } from './provider';

export type Role = 'user' | 'assistant' | 'system';

export interface MessageMetrics {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCost?: number; // USD estimated
  durationMs?: number;    // Time taken to generate in ms
  tokensPerSec?: number;  // completion tokens per sec
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  provider?: ProviderId;
  model?: string;
  timestamp: number;
  status?: 'sending' | 'streaming' | 'completed' | 'error';
  error?: string;
  metrics?: MessageMetrics;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  provider: ProviderId;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  messages: Message[];
  isPinned?: boolean;
  tags?: string[];
}

export interface CompareSlot {
  id: string;
  provider: ProviderId;
  model: string;
  content: string;
  status: 'idle' | 'generating' | 'completed' | 'error';
  error?: string;
  metrics?: MessageMetrics;
  prompt?: string;
  timestamp?: number;
}

export interface CompareExportData {
  version: number;
  exportedAt: number;
  prompt: string;
  slots: Array<{
    provider: ProviderId;
    model: string;
    modelName: string;
    content: string;
    status: 'idle' | 'generating' | 'completed' | 'error';
    error?: string;
    metrics?: MessageMetrics;
  }>;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  defaultProvider: ProviderId;
  defaultModel: string;
  systemPrompt: string;
  temperature: number;
  mockMode: boolean;
  showCostEstimates: boolean;
  streamResponses: boolean;
}

export interface ChatApiRequest {
  provider: ProviderId;
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  systemPrompt?: string;
  temperature?: number;
  stream?: boolean;
  mockMode?: boolean;
}

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  conversations?: Conversation[];
}
