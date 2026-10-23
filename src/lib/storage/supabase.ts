import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co'
);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

/**
 * SQL Schema for PostgreSQL / Supabase
 * You can execute this in your Supabase SQL Editor to enable cloud history and auth:
 *
 * ```sql
 * -- 1. Conversations table
 * CREATE TABLE IF NOT EXISTS public.conversations (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *   title TEXT NOT NULL,
 *   provider TEXT NOT NULL,
 *   model TEXT NOT NULL,
 *   system_prompt TEXT,
 *   temperature NUMERIC DEFAULT 0.7,
 *   is_pinned BOOLEAN DEFAULT false,
 *   tags TEXT[] DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * -- 2. Messages table
 * CREATE TABLE IF NOT EXISTS public.messages (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
 *   role TEXT NOT NULL,
 *   content TEXT NOT NULL,
 *   provider TEXT,
 *   model TEXT,
 *   prompt_tokens INTEGER,
 *   completion_tokens INTEGER,
 *   estimated_cost NUMERIC,
 *   duration_ms INTEGER,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * -- Enable Row Level Security (RLS)
 * ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Users can manage their own conversations"
 *   ON public.conversations FOR ALL USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can manage messages in their conversations"
 *   ON public.messages FOR ALL USING (
 *     EXISTS (
 *       SELECT 1 FROM public.conversations
 *       WHERE conversations.id = messages.conversation_id
 *       AND conversations.user_id = auth.uid()
 *     )
 *   );
 * ```
 */
