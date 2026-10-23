'use client';

import React from 'react';
import { Sparkles, Bot, Zap, ArrowRight, Code, Cpu, Compass, Layers, ShieldCheck } from 'lucide-react';
import { ProviderId } from '@/types/provider';
import { PROVIDERS } from '@/lib/ai/providers';

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string, provider?: ProviderId, model?: string) => void;
  mockMode: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  mockMode,
}) => {
  const starterPrompts = [
    {
      title: 'Compare Frontier Models',
      desc: 'Evaluate GPT-4o vs Claude 3.5 Sonnet vs Gemini 1.5 Pro on reasoning.',
      prompt: 'Compare the architectural strengths of GPT-4o, Claude 3.5 Sonnet, and Gemini 1.5 Pro for full-stack engineering.',
      icon: <Layers size={18} className="text-indigo-400" />,
      provider: 'openai' as ProviderId,
      model: 'gpt-4o',
    },
    {
      title: 'TypeScript Debounce Utility',
      desc: 'Generate a production-grade debounce function with generics and cancel token.',
      prompt: 'Write a TypeScript debounce function with proper typings, generic arguments, and a cancel method.',
      icon: <Code size={18} className="text-emerald-400" />,
      provider: 'anthropic' as ProviderId,
      model: 'claude-3-5-sonnet-20241022',
    },
    {
      title: 'Massive Context Analysis',
      desc: 'Simulate querying Gemini 2M context window for large codebase refactoring.',
      prompt: 'How would you architect a distributed event-driven messaging service using Redis and Kafka?',
      icon: <Zap size={18} className="text-blue-400" />,
      provider: 'gemini' as ProviderId,
      model: 'gemini-1.5-pro',
    },
    {
      title: 'System Design Critique',
      desc: 'Deconstruct microservices vs modular monoliths for a high-traffic SaaS.',
      prompt: 'What are the trade-offs of microservices vs modular monolith for an early stage SaaS with 10k DAU?',
      icon: <Cpu size={18} className="text-amber-400" />,
      provider: 'openai' as ProviderId,
      model: 'o3-mini',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-4xl mx-auto">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
        <Sparkles size={14} className="text-indigo-400" />
        <span>Unified Multi-Provider AI Platform</span>
      </div>

      {/* Main Title */}
      <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-100 mb-3">
        Experience All Top AIs in One Unified Hub
      </h1>
      <p className="text-sm sm:text-base text-slate-400 max-w-2xl mb-8 leading-relaxed">
        Switch seamlessly between OpenAI ChatGPT, Anthropic Claude, and Google Gemini.
        Run side-by-side model comparisons, stream real responses, and track token usage.
      </p>

      {/* Mock Mode / Verification Banner */}
      {mockMode && (
        <div className="w-full mb-8 p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-700/40 text-left flex items-start gap-3 text-xs sm:text-sm text-indigo-200">
          <ShieldCheck size={20} className="text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-white">Phase 1 Mock Mode Active: </span>
            You can test the complete UI, streaming animations, markdown code rendering, model picker, and history persistence right now.
            Connect your live keys in Settings anytime to trigger official API calls.
          </div>
        </div>
      )}

      {/* Provider Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mb-8 text-left">
        {/* OpenAI */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles size={16} />
            </div>
            <span className="font-semibold text-sm text-slate-200">OpenAI</span>
            <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
              3 Models
            </span>
          </div>
          <p className="text-xs text-slate-400">GPT-4o, GPT-4o-mini & o3-mini for STEM reasoning and multi-modal tasks.</p>
        </div>

        {/* Anthropic */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-amber-500/40 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bot size={16} />
            </div>
            <span className="font-semibold text-sm text-slate-200">Anthropic Claude</span>
            <span className="ml-auto text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded font-mono">
              3 Models
            </span>
          </div>
          <p className="text-xs text-slate-400">Claude 3.5 Sonnet, 3.5 Haiku & Opus with superior coding and nuanced prose.</p>
        </div>

        {/* Gemini */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-blue-500/40 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Zap size={16} />
            </div>
            <span className="font-semibold text-sm text-slate-200">Google Gemini</span>
            <span className="ml-auto text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded font-mono">
              3 Models
            </span>
          </div>
          <p className="text-xs text-slate-400">Gemini 1.5 Pro & Flash featuring up to 2,000,000 token context capacity.</p>
        </div>
      </div>

      {/* Starter Prompts Title */}
      <div className="w-full text-left mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Try a prompt
        </h3>
      </div>

      {/* Starter Prompt Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {starterPrompts.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(item.prompt, item.provider, item.model)}
            className="group p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/60 hover:border-indigo-500/40 text-left transition-all flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-slate-800/80 group-hover:bg-indigo-600/20 transition-colors shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </span>
                <ArrowRight size={13} className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {item.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
