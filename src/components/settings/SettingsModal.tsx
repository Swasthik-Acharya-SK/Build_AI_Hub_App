'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Sliders,
  Database,
  Check,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Bot,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { UserSettings } from '@/types/chat';
import { ALL_MODELS } from '@/lib/ai/providers';
import { isSupabaseConfigured } from '@/lib/storage/supabase';
import { cn } from '@/lib/utils';
import { ProviderStatus } from '@/types/provider';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void;
  onClearAllConversations: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllConversations,
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'general' | 'supabase'>('providers');
  const [formData, setFormData] = useState<UserSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    if (isOpen) {
      checkProviderStatus();
    }
  }, [isOpen]);

  const checkProviderStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        setProviderStatuses(data.providers || []);
      }
    } catch (e) {
      console.error('Failed to query provider status', e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  const openAIStatus = providerStatuses.find((p) => p.provider === 'openai');
  const anthropicStatus = providerStatuses.find((p) => p.provider === 'anthropic');
  const geminiStatus = providerStatuses.find((p) => p.provider === 'gemini');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div>
            <h2 className="text-base font-bold text-slate-100">Settings & Configuration</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage server credentials, defaults, and runtime preferences</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('providers')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition',
              activeTab === 'providers'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <Key size={14} /> Server API Keys
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition',
              activeTab === 'general'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <Sliders size={14} /> Model Defaults & Mock
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition',
              activeTab === 'supabase'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <Database size={14} /> Database & Storage
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'providers' && (
            <div className="space-y-5">
              {/* Security Banner */}
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-700/40 flex items-start gap-3 text-xs text-indigo-200">
                <ShieldCheck size={20} className="text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Server-Side Credential Security: </span>
                  API keys are loaded exclusively from server-side environment variables in <code className="bg-indigo-900/60 px-1 py-0.5 rounded text-indigo-200">.env.local</code>.
                  They are never exposed to browser JavaScript, never stored in client localStorage, and never returned in API payloads.
                </div>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span>Provider Environment Status</span>
                <button
                  onClick={checkProviderStatus}
                  disabled={isLoadingStatus}
                  className="flex items-center gap-1 hover:text-slate-200 transition"
                >
                  <RefreshCw size={12} className={cn(isLoadingStatus && 'animate-spin')} />
                  <span>Refresh status</span>
                </button>
              </div>

              {/* OpenAI Status Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-slate-100">OpenAI API</span>
                  </div>
                  {openAIStatus?.configured ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={12} /> Configured on server
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <XCircle size={12} /> Missing OPENAI_API_KEY
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Add to <code className="text-slate-300">.env.local</code>:
                </p>
                <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-xs text-emerald-300 border border-slate-800 select-all">
                  OPENAI_API_KEY=sk-proj-your_openai_api_key_here
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-500">GPT-4o, GPT-4o Mini, o3-mini</span>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    OpenAI Console <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Anthropic Claude Status Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot size={16} className="text-amber-400" />
                    <span className="text-sm font-semibold text-slate-100">Anthropic Claude</span>
                  </div>
                  {anthropicStatus?.configured ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={12} /> Configured on server
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <XCircle size={12} /> Missing ANTHROPIC_API_KEY
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Add to <code className="text-slate-300">.env.local</code>:
                </p>
                <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-xs text-amber-300 border border-slate-800 select-all">
                  ANTHROPIC_API_KEY=sk-ant-api03-your_anthropic_api_key_here
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-500">Claude 3.5 Sonnet, 3.5 Haiku, Opus</span>
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Anthropic Console <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Google Gemini Status Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-blue-400" />
                    <span className="text-sm font-semibold text-slate-100">Google Gemini</span>
                  </div>
                  {geminiStatus?.configured ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={12} /> Configured on server
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <XCircle size={12} /> Missing GEMINI_API_KEY
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Add to <code className="text-slate-300">.env.local</code>:
                </p>
                <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-xs text-blue-300 border border-slate-800 select-all">
                  GEMINI_API_KEY=AIzaSy_your_gemini_api_key_here
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-500">Gemini 1.5 Pro, 1.5 Flash, 2.0 Flash</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Google AI Studio <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Subscription Notice */}
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-300">Note on Subscriptions: </span>
                Developer API access and token billing are separate from consumer chat subscriptions (such as ChatGPT Plus, Claude Pro, or Gemini Advanced). API keys require credits or billing enabled in each provider&apos;s developer console.
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-5">
              {/* Mock Mode Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Interactive Mock Engine
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    When active, simulates token streaming without calling the live OpenAI API. Useful for testing UI when an API key is not yet configured.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.mockMode}
                  onChange={(e) => setFormData({ ...formData, mockMode: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Show Cost Estimates Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Display Usage Cost Estimates
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Calculates approximate USD cost based on official input/output token pricing.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.showCostEstimates}
                  onChange={(e) => setFormData({ ...formData, showCostEstimates: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Default Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 block">
                  Default AI Model
                </label>
                <select
                  value={formData.defaultModel}
                  onChange={(e) => {
                    const m = ALL_MODELS.find((mod) => mod.id === e.target.value);
                    if (m) {
                      setFormData({
                        ...formData,
                        defaultModel: m.id,
                        defaultProvider: m.provider,
                      });
                    }
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {ALL_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.provider.toUpperCase()}) &mdash; {m.badge || 'Standard'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Temperature Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-slate-200">Temperature</label>
                  <span className="font-mono text-indigo-400">{formData.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0.0 (Precise & Deterministic)</span>
                  <span>1.0 (Creative & Varied)</span>
                </div>
              </div>

              {/* Global System Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 block">
                  Global System Prompt
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Storage Backend Status:</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-semibold',
                      isSupabaseConfigured
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                    )}
                  >
                    {isSupabaseConfigured ? 'Supabase Cloud Connected' : 'Local Browser Storage Active'}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  The app is fully functional out of the box using localStorage with zero cloud requirements.
                  To synchronize across devices or enable user accounts, configure your Supabase URL & anon key in `.env.local`.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                <span className="text-xs font-semibold text-rose-300 block">Danger Zone</span>
                <p className="text-[11px] text-rose-300/80">
                  Permanently clear all conversation history and messages from browser storage.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete all saved conversations?')) {
                      onClearAllConversations();
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
                >
                  Clear All Saved Conversations
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
          >
            {isSaved ? <Check size={14} /> : null}
            <span>{isSaved ? 'Saved!' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
