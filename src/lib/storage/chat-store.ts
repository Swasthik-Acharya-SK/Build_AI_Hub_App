'use client';

import type {
  Conversation,
  Message,
  UserSettings,
  CompareSlot,
  ImportValidationResult,
} from '../../types/chat';
import type { ProviderId } from '../../types/provider';

const SETTINGS_KEY = 'ai_hub_settings_v1';
const CONVERSATIONS_KEY = 'ai_hub_conversations_v1';
const ACTIVE_CONVO_KEY = 'ai_hub_active_convo_id_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o',
  systemPrompt: 'You are an expert AI assistant. Provide direct, concise, and technically sound answers.',
  temperature: 0.7,
  mockMode: true, // Default to true until server API key is configured
  showCostEstimates: true,
  streamResponses: true,
};

export const INITIAL_COMPARE_SLOTS: CompareSlot[] = [
  {
    id: 'slot-1',
    provider: 'openai',
    model: 'gpt-4o',
    content: '',
    status: 'idle',
  },
  {
    id: 'slot-2',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    content: '',
    status: 'idle',
  },
  {
    id: 'slot-3',
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    content: '',
    status: 'idle',
  },
];

export function getStoredSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);

    // Security cleanup: Strip legacy keys if present
    if (parsed.customKeys) {
      delete parsed.customKeys;
      saveStoredSettings({ ...DEFAULT_SETTINGS, ...parsed });
    }

    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    console.error('Error loading settings from localStorage', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    const safeSettings: UserSettings = {
      theme: settings.theme,
      defaultProvider: settings.defaultProvider,
      defaultModel: settings.defaultModel,
      systemPrompt: settings.systemPrompt,
      temperature: settings.temperature,
      mockMode: settings.mockMode,
      showCostEstimates: settings.showCostEstimates,
      streamResponses: settings.streamResponses,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(safeSettings));
  } catch (e) {
    console.error('Error saving settings to localStorage', e);
  }
}

export function getStoredConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error('Error loading conversations from localStorage', e);
    return [];
  }
}

export function saveStoredConversations(conversations: Conversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Error saving conversations to localStorage', e);
  }
}

export function getStoredActiveId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_CONVO_KEY);
}

export function saveStoredActiveId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(ACTIVE_CONVO_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_CONVO_KEY);
  }
}

export function createNewConversation(
  provider: ProviderId = 'openai',
  model: string = 'gpt-4o',
  title = 'New Chat',
  tags: string[] = []
): Conversation {
  return {
    id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    provider,
    model,
    messages: [],
    isPinned: false,
    tags,
  };
}

/**
 * Searches across conversation titles, tags, and message contents.
 */
export function searchConversations(
  conversations: Conversation[],
  rawQuery: string
): Conversation[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return conversations;

  return conversations.filter((c) => {
    // 1. Match title
    if (c.title.toLowerCase().includes(query)) return true;

    // 2. Match tags
    if (c.tags && c.tags.some((t) => t.toLowerCase().includes(query))) {
      return true;
    }

    // 3. Match message content
    if (c.messages && c.messages.some((m) => m.content && m.content.toLowerCase().includes(query))) {
      return true;
    }

    // 4. Match model or provider
    if (c.provider.toLowerCase().includes(query) || c.model.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  });
}

/**
 * Validates and sanitizes imported JSON conversation backups.
 * Defends against oversized payloads, invalid JSON, or missing required fields.
 */
export function validateAndParseImport(rawJson: string): ImportValidationResult {
  if (!rawJson || typeof rawJson !== 'string') {
    return { valid: false, error: 'Import payload is empty.' };
  }

  // Size guard: Reject imports greater than 10MB
  if (rawJson.length > 10 * 1024 * 1024) {
    return { valid: false, error: 'Import file exceeds safe maximum limit of 10MB.' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err: any) {
    return { valid: false, error: `Invalid JSON format: ${err?.message || 'Syntax error'}` };
  }

  // Allow either direct array or { conversations: [...] }
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.conversations)
    ? parsed.conversations
    : null;

  if (!list) {
    return {
      valid: false,
      error: 'Unrecognized backup structure. Expected an array of conversations.',
    };
  }

  const sanitized: Conversation[] = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item || typeof item !== 'object') continue;

    // Validate minimum required fields
    const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : `Imported Chat ${i + 1}`;
    const provider: ProviderId = ['openai', 'anthropic', 'gemini'].includes(item.provider)
      ? item.provider
      : 'openai';
    const model = typeof item.model === 'string' && item.model.trim() ? item.model.trim() : 'gpt-4o';
    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `conv_imp_${Date.now()}_${i}`;
    const createdAt = typeof item.createdAt === 'number' ? item.createdAt : Date.now();
    const updatedAt = typeof item.updatedAt === 'number' ? item.updatedAt : Date.now();
    const isPinned = Boolean(item.isPinned);
    const tags = Array.isArray(item.tags)
      ? item.tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim())
      : [];

    // Sanitize messages
    const messages: Message[] = [];
    if (Array.isArray(item.messages)) {
      for (let j = 0; j < item.messages.length; j++) {
        const m = item.messages[j];
        if (!m || typeof m !== 'object') continue;

        const role = ['user', 'assistant', 'system'].includes(m.role) ? m.role : 'user';
        const content = typeof m.content === 'string' ? m.content : '';
        if (!content) continue;

        messages.push({
          id: typeof m.id === 'string' ? m.id : `msg_${Date.now()}_${j}`,
          role,
          content,
          provider: m.provider,
          model: m.model,
          timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
          status: m.status === 'error' ? 'error' : 'completed',
          metrics: m.metrics,
        });
      }
    }

    sanitized.push({
      id,
      title,
      createdAt,
      updatedAt,
      provider,
      model,
      systemPrompt: item.systemPrompt,
      temperature: typeof item.temperature === 'number' ? item.temperature : 0.7,
      messages,
      isPinned,
      tags,
    });
  }

  if (sanitized.length === 0) {
    return {
      valid: false,
      error: 'No valid conversations could be extracted from the file.',
    };
  }

  return {
    valid: true,
    conversations: sanitized,
  };
}
