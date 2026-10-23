import { NextResponse } from 'next/server';
import { PROVIDERS } from '@/lib/ai/providers';
import { ProviderStatus } from '@/types/provider';

export const runtime = 'nodejs';

export async function GET() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  const statuses: ProviderStatus[] = [
    {
      provider: 'openai',
      configured: hasOpenAI,
      usingCustomKey: false,
      activeModelCount: PROVIDERS.openai.models.length,
    },
    {
      provider: 'anthropic',
      configured: hasAnthropic,
      usingCustomKey: false,
      activeModelCount: PROVIDERS.anthropic.models.length,
    },
    {
      provider: 'gemini',
      configured: hasGemini,
      usingCustomKey: false,
      activeModelCount: PROVIDERS.gemini.models.length,
    },
  ];

  return NextResponse.json({
    providers: statuses,
    forceMock: process.env.NEXT_PUBLIC_FORCE_MOCK === 'true',
  });
}
