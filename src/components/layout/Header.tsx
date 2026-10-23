'use client';

import React from 'react';
import {
  Menu,
  MessageSquare,
  Columns,
  Settings as SettingsIcon,
  Moon,
  Sun,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { ProviderId } from '@/types/provider';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { cn } from '@/lib/utils';

interface HeaderProps {
  currentMode: 'chat' | 'compare';
  onSelectMode: (mode: 'chat' | 'compare') => void;
  currentModelId: string;
  onSelectModel: (provider: ProviderId, modelId: string) => void;
  mockMode: boolean;
  onToggleMockMode: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  currentModelId,
  onSelectModel,
  mockMode,
  onToggleMockMode,
  theme,
  onToggleTheme,
  onOpenSettings,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Left side: Hamburger (mobile) + App Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
            AI
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-100 hidden sm:inline">
            All-in-One AI Hub
          </span>
        </div>
      </div>

      {/* Center: Mode Switcher (Chat vs Compare Arena) */}
      <div className="flex items-center rounded-xl bg-slate-950/70 p-1 border border-slate-800/80">
        <button
          type="button"
          onClick={() => onSelectMode('chat')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition',
            currentMode === 'chat'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <MessageSquare size={13} />
          <span>Chat</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('compare')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition',
            currentMode === 'compare'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <Columns size={13} />
          <span>Compare Arena</span>
        </button>
      </div>

      {/* Right: Mock Mode Toggle + Theme Toggle + Settings Button */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Mock Mode Pill */}
        <button
          type="button"
          onClick={onToggleMockMode}
          className={cn(
            'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition',
            mockMode
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
          )}
          title="Click to toggle Mock Mode"
        >
          {mockMode ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
          <span>{mockMode ? 'Mock Mode' : 'Live API'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          title="Settings & API Keys"
          aria-label="Open settings"
        >
          <SettingsIcon size={17} />
        </button>
      </div>
    </header>
  );
};
