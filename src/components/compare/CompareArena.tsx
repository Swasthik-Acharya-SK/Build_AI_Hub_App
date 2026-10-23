'use client';

import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Bot,
  Zap,
  Play,
  RotateCcw,
  Copy,
  Check,
  Clock,
  DollarSign,
  AlertCircle,
  Plus,
  Trash2,
  Share2,
  Square,
  FileJson,
  FileText,
  RotateCw,
} from 'lucide-react';
import { ProviderId } from '@/types/provider';
import { CompareSlot, CompareExportData } from '@/types/chat';
import { getModelById, calculateEstimatedCost } from '@/lib/ai/providers';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { cn, copyToClipboard, formatCost } from '@/lib/utils';

interface CompareArenaProps {
  mockMode: boolean;
  showCostEstimates?: boolean;
}

export const CompareArena: React.FC<CompareArenaProps> = ({
  mockMode,
  showCostEstimates = true,
}) => {
  const [slots, setSlots] = useState<CompareSlot[]>([
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
  ]);

  const [prompt, setPrompt] = useState('');
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [copiedSlotId, setCopiedSlotId] = useState<string | null>(null);
  const [copiedAllMarkdown, setCopiedAllMarkdown] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const handleModelChange = (slotId: string, provider: ProviderId, modelId: string) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, provider, model: modelId } : slot))
    );
  };

  const handleAddSlot = () => {
    if (slots.length >= 4) return;
    const newSlot: CompareSlot = {
      id: `slot-${Date.now()}`,
      provider: 'openai',
      model: 'gpt-4o-mini',
      content: '',
      status: 'idle',
    };
    setSlots([...slots, newSlot]);
  };

  const handleRemoveSlot = (slotId: string) => {
    if (slots.length <= 2) return;
    setSlots(slots.filter((s) => s.id !== slotId));
  };

  const handleClearAll = () => {
    handleStopAll();
    setSlots((prev) =>
      prev.map((s) => ({
        ...s,
        content: '',
        status: 'idle',
        error: undefined,
        metrics: undefined,
      }))
    );
  };

  const handleStopAll = () => {
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();
    setIsRunning(false);
  };

  const handleCopySlot = async (slotId: string, text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedSlotId(slotId);
      setTimeout(() => setCopiedSlotId(null), 2000);
    }
  };

  const handleExportMarkdown = async () => {
    const activePrompt = lastSubmittedPrompt || prompt;
    let md = `# AI Comparison Arena Results\n\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**Prompt:** "${activePrompt}"\n\n---\n\n`;

    slots.forEach((s, idx) => {
      const meta = getModelById(s.model);
      md += `## ${idx + 1}. ${meta?.name || s.model} (${s.provider.toUpperCase()})\n\n`;
      if (s.metrics) {
        md += `*Latency: ${(s.metrics.durationMs! / 1000).toFixed(2)}s | Tokens: ~${s.metrics.completionTokens || 0} | Estimated Cost: ${formatCost(s.metrics.estimatedCost || 0)}*\n\n`;
      }
      md += `${s.content || `*(Status: ${s.status}${s.error ? ` - ${s.error}` : ''})*`}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ai_comparison_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setIsExportMenuOpen(false);

    setCopiedAllMarkdown(true);
    setTimeout(() => setCopiedAllMarkdown(false), 2000);
  };

  const handleExportJson = () => {
    const activePrompt = lastSubmittedPrompt || prompt;
    const exportData: CompareExportData = {
      version: 1,
      exportedAt: Date.now(),
      prompt: activePrompt,
      slots: slots.map((s) => {
        const meta = getModelById(s.model);
        return {
          provider: s.provider,
          model: s.model,
          modelName: meta?.name || s.model,
          content: s.content,
          status: s.status,
          error: s.error,
          metrics: s.metrics,
        };
      }),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `ai_comparison_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setIsExportMenuOpen(false);
  };

  // Run a single slot (used for individual slot retry without re-querying successful slots)
  const runSingleSlot = async (slotId: string) => {
    const targetSlot = slots.find((s) => s.id === slotId);
    const queryPrompt = lastSubmittedPrompt || prompt;
    if (!targetSlot || !queryPrompt.trim()) return;

    // Reset this slot only
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, content: '', status: 'generating', error: undefined, metrics: undefined }
          : s
      )
    );

    const controller = new AbortController();
    abortControllersRef.current.set(slotId, controller);
    const startTime = Date.now();
    let accumulatedText = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: targetSlot.provider,
          model: targetSlot.model,
          messages: [{ role: 'user', content: queryPrompt }],
          stream: true,
          mockMode,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable response stream.');

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const textChunk = decoder.decode(value, { stream: true });
        accumulatedText += textChunk;
        setSlots((prev) =>
          prev.map((s) => (s.id === slotId ? { ...s, content: accumulatedText } : s))
        );
      }

      const durationMs = Date.now() - startTime;
      const promptTokens = Math.ceil(queryPrompt.length / 4);
      const completionTokens = Math.ceil(accumulatedText.length / 4);
      const cost = calculateEstimatedCost(targetSlot.model, promptTokens, completionTokens);

      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'completed',
                metrics: {
                  durationMs,
                  promptTokens,
                  completionTokens,
                  estimatedCost: cost,
                  tokensPerSec: durationMs > 0 ? completionTokens / (durationMs / 1000) : 0,
                },
              }
            : s
        )
      );
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, status: 'error', error: err?.message || 'Comparison query failed.' }
            : s
        )
      );
    } finally {
      abortControllersRef.current.delete(slotId);
    }
  };

  // Run all comparison slots concurrently
  const runComparison = async () => {
    if (!prompt.trim() || isRunning) return;

    setIsRunning(true);
    setLastSubmittedPrompt(prompt);

    // Reset contents
    setSlots((prev) =>
      prev.map((s) => ({
        ...s,
        content: '',
        status: 'generating',
        error: undefined,
        metrics: undefined,
      }))
    );

    // Cancel any previous requests
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();

    const currentPrompt = prompt;

    // Run parallel queries across all slots without letting one failure cancel others
    const tasks = slots.map(async (slot) => {
      const controller = new AbortController();
      abortControllersRef.current.set(slot.id, controller);

      const startTime = Date.now();
      let accumulatedText = '';

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: slot.provider,
            model: slot.model,
            messages: [{ role: 'user', content: currentPrompt }],
            stream: true,
            mockMode,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No readable response body.');

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const textChunk = decoder.decode(value, { stream: true });
          accumulatedText += textChunk;
          setSlots((prev) =>
            prev.map((s) => (s.id === slot.id ? { ...s, content: accumulatedText } : s))
          );
        }

        const durationMs = Date.now() - startTime;
        const promptTokens = Math.ceil(currentPrompt.length / 4);
        const completionTokens = Math.ceil(accumulatedText.length / 4);
        const cost = calculateEstimatedCost(slot.model, promptTokens, completionTokens);

        setSlots((prev) =>
          prev.map((s) =>
            s.id === slot.id
              ? {
                  ...s,
                  status: 'completed',
                  metrics: {
                    durationMs,
                    promptTokens,
                    completionTokens,
                    estimatedCost: cost,
                    tokensPerSec: durationMs > 0 ? completionTokens / (durationMs / 1000) : 0,
                  },
                }
              : s
          )
        );
      } catch (err: any) {
        if (controller.signal.aborted) {
          setSlots((prev) =>
            prev.map((s) =>
              s.id === slot.id
                ? { ...s, status: s.content ? 'completed' : 'idle' }
                : s
            )
          );
          return;
        }

        setSlots((prev) =>
          prev.map((s) =>
            s.id === slot.id
              ? { ...s, status: 'error', error: err?.message || 'Comparison stream failed.' }
              : s
          )
        );
      } finally {
        abortControllersRef.current.delete(slot.id);
      }
    });

    await Promise.allSettled(tasks);
    setIsRunning(false);
  };

  const getProviderIcon = (provider: ProviderId) => {
    switch (provider) {
      case 'openai':
        return <Sparkles size={16} className="text-emerald-400" />;
      case 'anthropic':
        return <Bot size={16} className="text-amber-400" />;
      case 'gemini':
        return <Zap size={16} className="text-blue-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/40">
      {/* Top Arena Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Compare AI Arena</h2>
            <p className="text-xs text-slate-400">
              Benchmark 2 to 4 models simultaneously with identical prompts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {slots.length < 4 && (
            <button
              type="button"
              onClick={handleAddSlot}
              disabled={isRunning}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition',
                isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700'
              )}
              title="Add model column (max 4)"
            >
              <Plus size={14} /> Add Model
            </button>
          )}

          <button
            type="button"
            onClick={handleClearAll}
            disabled={isRunning}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition',
              isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700'
            )}
            title="Reset outputs"
          >
            <RotateCcw size={13} /> Reset
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
              title="Export comparison"
            >
              {copiedAllMarkdown ? <Check size={13} /> : <Share2 size={13} />}
              <span>Export</span>
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-50 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-slate-800 text-left transition"
                >
                  <FileText size={14} className="text-indigo-400" />
                  <span>Download Markdown (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-slate-800 text-left transition border-t border-slate-800"
                >
                  <FileJson size={14} className="text-emerald-400" />
                  <span>Download JSON (.json)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Grid Columns */}
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className={cn(
            'grid gap-4 h-full',
            slots.length === 2 && 'grid-cols-1 md:grid-cols-2',
            slots.length === 3 && 'grid-cols-1 md:grid-cols-3',
            slots.length >= 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          )}
        >
          {slots.map((slot) => {
            const meta = getModelById(slot.model);
            return (
              <div
                key={slot.id}
                className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 shadow-lg overflow-hidden transition-all"
              >
                {/* Column Card Header */}
                <div className="p-3 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getProviderIcon(slot.provider)}
                    <ModelSelector
                      currentModelId={slot.model}
                      onSelectModel={(p, m) => handleModelChange(slot.id, p, m)}
                      compact
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {slot.status === 'error' && (
                      <button
                        onClick={() => runSingleSlot(slot.id)}
                        disabled={isRunning}
                        className="p-1 rounded text-amber-400 hover:text-amber-200 hover:bg-slate-800 transition"
                        title="Retry this model alone"
                      >
                        <RotateCw size={13} />
                      </button>
                    )}

                    {slot.content && (
                      <button
                        onClick={() => handleCopySlot(slot.id, slot.content)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                        title="Copy this response"
                      >
                        {copiedSlotId === slot.id ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    )}

                    {slots.length > 2 && (
                      <button
                        onClick={() => handleRemoveSlot(slot.id)}
                        disabled={isRunning}
                        className={cn(
                          'p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition',
                          isRunning && 'opacity-30 cursor-not-allowed'
                        )}
                        title="Remove column"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Column Body */}
                <div className="flex-1 p-4 overflow-y-auto text-sm text-slate-200 leading-relaxed min-h-[220px]">
                  {slot.status === 'idle' && !slot.content && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs py-12">
                      <p className="font-medium">Awaiting prompt</p>
                      <p className="mt-1 text-[11px] text-slate-600 max-w-[200px]">
                        Submit a prompt below to evaluate {meta?.name || slot.model} concurrently.
                      </p>
                    </div>
                  )}

                  {slot.status === 'generating' && !slot.content && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-indigo-400 text-xs py-12">
                      <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p>Connecting to {slot.provider.toUpperCase()}...</p>
                    </div>
                  )}

                  {slot.status === 'error' && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
                        <span>{slot.error || 'Provider request failed.'}</span>
                      </div>
                      <button
                        onClick={() => runSingleSlot(slot.id)}
                        disabled={isRunning}
                        className="self-start text-[11px] font-semibold text-rose-200 underline hover:no-underline"
                      >
                        Retry this provider
                      </button>
                    </div>
                  )}

                  {slot.content && (
                    <div className="prose-ai">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {slot.content}
                      </ReactMarkdown>
                      {slot.status === 'generating' && (
                        <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
                      )}
                    </div>
                  )}
                </div>

                {/* Column Metrics Footer */}
                {slot.metrics && (
                  <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1" title="Generation latency">
                      <Clock size={12} className="text-slate-500" />
                      {(slot.metrics.durationMs! / 1000).toFixed(2)}s
                    </span>

                    <span title="Tokens generated">
                      ~{slot.metrics.completionTokens} tokens
                    </span>

                    {showCostEstimates && slot.metrics.estimatedCost !== undefined && (
                      <span
                        className="text-emerald-400 font-mono"
                        title="Estimated cost based on token pricing"
                      >
                        {formatCost(slot.metrics.estimatedCost)} <span className="text-[9px] text-slate-500">(est.)</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Prompt Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isRunning) {
                runComparison();
              }
            }}
            placeholder="Type a comparison prompt (e.g. 'Compare Rust vs Go memory safety models')..."
            disabled={isRunning}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
          />

          {isRunning ? (
            <button
              type="button"
              onClick={handleStopAll}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md transition"
              title="Stop all comparisons"
            >
              <Square size={14} fill="currentColor" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={runComparison}
              disabled={!prompt.trim()}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition',
                !prompt.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]'
              )}
            >
              <Play size={15} fill="currentColor" />
              <span>Compare</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
