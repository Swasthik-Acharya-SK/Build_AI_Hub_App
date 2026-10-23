'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles, SlidersHorizontal, CornerDownLeft } from 'lucide-react';
import { ProviderId } from '@/types/provider';
import { ModelSelector } from './ModelSelector';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onStopStreaming?: () => void;
  isStreaming: boolean;
  currentModelId: string;
  onSelectModel: (provider: ProviderId, modelId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  currentModelId,
  onSelectModel,
  placeholder = 'Type your prompt here...',
  disabled = false,
}) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (disabled || isStreaming || !content.trim()) return;
    onSendMessage(content.trim());
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 pt-1">
      <div className="relative rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-xl backdrop-blur transition-all focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/40">
        {/* Top bar inside input: Model picker & controls */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-slate-800/60">
          <ModelSelector
            currentModelId={currentModelId}
            onSelectModel={onSelectModel}
            compact
          />
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="hidden sm:inline">Shift + Enter for new line</span>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none max-h-48 leading-relaxed"
        />

        {/* Bottom toolbar inside input: Action buttons */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {/* Any extra status indicator */}
          </div>

          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold shadow transition-all"
                title="Stop generation"
              >
                <Square size={12} fill="currentColor" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={disabled || !content.trim()}
                className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-lg transition-all shadow',
                  content.trim() && !disabled
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                )}
                title="Send message (Enter)"
              >
                <Send size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
