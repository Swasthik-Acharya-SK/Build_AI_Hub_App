'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Bot, Zap, Check, Info } from 'lucide-react';
import { PROVIDERS, ALL_MODELS, getModelById } from '@/lib/ai/providers';
import { ProviderId, ModelMeta } from '@/types/provider';
import { cn, formatNumber } from '@/lib/utils';

interface ModelSelectorProps {
  currentModelId: string;
  onSelectModel: (provider: ProviderId, modelId: string) => void;
  className?: string;
  compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModelId,
  onSelectModel,
  className,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProviderTab, setSelectedProviderTab] = useState<ProviderId | 'all'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = getModelById(currentModelId) || ALL_MODELS[0];
  const providerMeta = PROVIDERS[currentModel.provider];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getProviderIcon = (provider: ProviderId, size = 16) => {
    switch (provider) {
      case 'openai':
        return <Sparkles size={size} className="text-emerald-400" />;
      case 'anthropic':
        return <Bot size={size} className="text-amber-400" />;
      case 'gemini':
        return <Zap size={size} className="text-blue-400" />;
    }
  };

  const filteredModels = selectedProviderTab === 'all'
    ? ALL_MODELS
    : ALL_MODELS.filter((m) => m.provider === selectedProviderTab);

  return (
    <div className={cn('relative inline-block text-left', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/90 text-slate-100 hover:bg-slate-800/80 transition-all shadow-sm',
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
        )}
      >
        <span className="flex items-center justify-center">
          {getProviderIcon(currentModel.provider, compact ? 14 : 16)}
        </span>
        <span className="font-medium tracking-tight truncate max-w-[140px] sm:max-w-[200px]">
          {currentModel.name}
        </span>
        {currentModel.badge && (
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
            {currentModel.badge}
          </span>
        )}
        <ChevronDown size={14} className={cn('text-slate-400 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Provider Filter Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1 text-xs">
            <button
              onClick={() => setSelectedProviderTab('all')}
              className={cn(
                'flex-1 py-1 px-2 rounded-md font-medium transition-colors text-center',
                selectedProviderTab === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              All Providers
            </button>
            <button
              onClick={() => setSelectedProviderTab('openai')}
              className={cn(
                'flex items-center justify-center gap-1.5 flex-1 py-1 px-2 rounded-md font-medium transition-colors',
                selectedProviderTab === 'openai' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-emerald-400'
              )}
            >
              <Sparkles size={12} /> OpenAI
            </button>
            <button
              onClick={() => setSelectedProviderTab('anthropic')}
              className={cn(
                'flex items-center justify-center gap-1.5 flex-1 py-1 px-2 rounded-md font-medium transition-colors',
                selectedProviderTab === 'anthropic' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-amber-400'
              )}
            >
              <Bot size={12} /> Claude
            </button>
            <button
              onClick={() => setSelectedProviderTab('gemini')}
              className={cn(
                'flex items-center justify-center gap-1.5 flex-1 py-1 px-2 rounded-md font-medium transition-colors',
                selectedProviderTab === 'gemini' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-blue-400'
              )}
            >
              <Zap size={12} /> Gemini
            </button>
          </div>

          {/* Model list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50 p-1">
            {filteredModels.map((model) => {
              const isSelected = model.id === currentModelId;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.provider, model.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors',
                    isSelected ? 'bg-indigo-950/50 border border-indigo-700/50' : 'hover:bg-slate-800/60'
                  )}
                >
                  <div className="mt-1 flex-shrink-0">
                    {getProviderIcon(model.provider, 18)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-sm text-slate-100 truncate">
                        {model.name}
                      </span>
                      {isSelected && <Check size={16} className="text-indigo-400 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {model.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                        {formatNumber(model.contextWindow)} ctx
                      </span>
                      <span>
                        ${model.pricing.inputPer1M.toFixed(2)}/1M in &bull; ${model.pricing.outputPer1M.toFixed(2)}/1M out
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-slate-800/80 bg-slate-950/80 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info size={13} className="text-indigo-400 flex-shrink-0" />
            <span>Official APIs with streaming & cost calculation</span>
          </div>
        </div>
      )}
    </div>
  );
};
