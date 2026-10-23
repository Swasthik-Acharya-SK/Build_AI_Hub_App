'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RotateCw, Sparkles, Bot, Zap, User, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { Message } from '@/types/chat';
import { ProviderId } from '@/types/provider';
import { getModelById } from '@/lib/ai/providers';
import { cn, copyToClipboard, formatCost } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  onRetry?: (messageId: string) => void;
  showCostEstimates?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onRetry,
  showCostEstimates = true,
}) => {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';
  const modelMeta = message.model ? getModelById(message.model) : undefined;

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getProviderIcon = (provider?: ProviderId) => {
    switch (provider) {
      case 'openai':
        return <Sparkles size={14} className="text-emerald-400" />;
      case 'anthropic':
        return <Bot size={14} className="text-amber-400" />;
      case 'gemini':
        return <Zap size={14} className="text-blue-400" />;
      default:
        return <Sparkles size={14} className="text-indigo-400" />;
    }
  };

  return (
    <div
      className={cn(
        'group relative flex w-full gap-3 py-4 transition-colors',
        isAssistant ? 'bg-slate-900/40 border-b border-slate-800/40' : 'bg-transparent'
      )}
    >
      <div className="max-w-4xl mx-auto w-full flex gap-3 sm:gap-4 px-4">
        {/* Avatar */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg shadow-sm',
            isAssistant
              ? 'bg-slate-800 border border-slate-700 text-slate-100'
              : 'bg-indigo-600 text-white'
          )}
        >
          {isAssistant ? getProviderIcon(message.provider) : <User size={16} />}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden">
          {/* Header info */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                {isAssistant ? (modelMeta?.name || message.model || 'AI Assistant') : 'You'}
              </span>
              {isAssistant && message.provider && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
                  {message.provider}
                </span>
              )}
              <span className="text-[11px] text-slate-500">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Quick Actions (Copy / Retry) */}
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
                title="Copy message"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>

              {isAssistant && onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(message.id)}
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
                  title="Regenerate response"
                >
                  <RotateCw size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {message.status === 'error' && (
            <div className="my-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <p className="font-medium">Request failed</p>
                <p className="text-xs text-rose-300/80 mt-0.5">{message.error || 'An unexpected error occurred.'}</p>
                {onRetry && (
                  <button
                    onClick={() => onRetry(message.id)}
                    className="mt-2 text-xs font-semibold underline hover:no-underline text-rose-200"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Message Markdown Content */}
          <div className="prose-ai text-slate-200 break-words leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && match) {
                    return (
                      <div className="relative my-3 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950 font-mono text-xs">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
                          <span className="text-[11px] font-semibold tracking-wider lowercase">
                            {match[1]}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(codeString)}
                            className="flex items-center gap-1 text-[11px] hover:text-slate-200 transition-colors"
                          >
                            <Copy size={12} />
                            <span>Copy</span>
                          </button>
                        </div>
                        <pre className="p-3 overflow-x-auto text-slate-200">
                          <code>{children}</code>
                        </pre>
                      </div>
                    );
                  }

                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>

            {/* Blinking cursor while streaming */}
            {message.status === 'streaming' && (
              <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
            )}
          </div>

          {/* Metrics Footer (Tokens, Duration, Estimated Cost) */}
          {isAssistant && message.metrics && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
              {message.metrics.durationMs !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" />
                  {(message.metrics.durationMs / 1000).toFixed(2)}s
                </span>
              )}

              {message.metrics.completionTokens !== undefined && (
                <span>
                  ~{message.metrics.completionTokens} tokens
                  {message.metrics.tokensPerSec ? ` (${message.metrics.tokensPerSec.toFixed(1)} t/s)` : ''}
                </span>
              )}

              {showCostEstimates && message.metrics.estimatedCost !== undefined && (
                <span className="flex items-center gap-0.5 text-emerald-400/90 font-mono">
                  <DollarSign size={11} />
                  {formatCost(message.metrics.estimatedCost)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
