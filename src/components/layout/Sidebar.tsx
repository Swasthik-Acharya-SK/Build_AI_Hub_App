'use client';

import React, { useState, useRef } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Pin,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  Download,
  Upload,
  Tag,
  AlertTriangle,
  Sparkles,
  Bot,
  Zap,
} from 'lucide-react';
import { Conversation } from '@/types/chat';
import { ProviderId } from '@/types/provider';
import { cn } from '@/lib/utils';
import { searchConversations, validateAndParseImport } from '@/lib/storage/chat-store';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onImportConversations?: (imported: Conversation[]) => void;
  onOpenSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  onUpdateTags,
  onImportConversations,
  onOpenSettings,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [taggingId, setTaggingId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [importStatus, setImportStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search across titles, tags, and message content
  const filtered = searchConversations(conversations, searchQuery);
  const pinnedConversations = filtered.filter((c) => c.isPinned);
  const recentConversations = filtered.filter((c) => !c.isPinned);

  const startEditing = (c: Conversation) => {
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveEditing = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleExportChats = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(conversations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ai_hub_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = validateAndParseImport(content);

      if (result.valid && result.conversations) {
        if (onImportConversations) {
          onImportConversations(result.conversations);
        }
        setImportStatus({
          message: `Successfully imported ${result.conversations.length} conversation(s)!`,
          isError: false,
        });
      } else {
        setImportStatus({
          message: result.error || 'Failed to import conversations.',
          isError: true,
        });
      }

      setTimeout(() => setImportStatus(null), 3500);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  const handleAddTag = (c: Conversation) => {
    if (!tagInput.trim() || !onUpdateTags) return;
    const currentTags = c.tags || [];
    const newTag = tagInput.trim();
    if (!currentTags.includes(newTag)) {
      onUpdateTags(c.id, [...currentTags, newTag]);
    }
    setTagInput('');
    setTaggingId(null);
  };

  const handleRemoveTag = (c: Conversation, tagToRemove: string) => {
    if (!onUpdateTags) return;
    const currentTags = c.tags || [];
    onUpdateTags(c.id, currentTags.filter((t) => t !== tagToRemove));
  };

  const getProviderIcon = (provider?: ProviderId) => {
    switch (provider) {
      case 'openai':
        return <Sparkles size={13} className="text-emerald-400 shrink-0" />;
      case 'anthropic':
        return <Bot size={13} className="text-amber-400 shrink-0" />;
      case 'gemini':
        return <Zap size={13} className="text-blue-400 shrink-0" />;
      default:
        return <MessageSquare size={13} className="text-slate-400 shrink-0" />;
    }
  };

  const renderConversationItem = (c: Conversation) => {
    const isActive = c.id === activeId;
    const isEditing = c.id === editingId;
    const isTagging = c.id === taggingId;

    return (
      <div
        key={c.id}
        className={cn(
          'group relative flex flex-col rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer select-none',
          isActive
            ? 'bg-indigo-600/20 text-white border border-indigo-500/30 font-medium'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
        )}
        onClick={() => {
          if (!isEditing && !isTagging) {
            onSelectConversation(c.id);
            onCloseMobile();
          }
        }}
      >
        <div className="flex items-center gap-2 w-full">
          {getProviderIcon(c.provider)}

          {isEditing ? (
            <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditing(c.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
                className="flex-1 rounded border border-indigo-500 bg-slate-950 px-1.5 py-0.5 text-xs text-white focus:outline-none"
              />
              <button onClick={() => saveEditing(c.id)} className="p-1 hover:text-emerald-400" title="Save">
                <Check size={12} />
              </button>
              <button onClick={() => setEditingId(null)} className="p-1 hover:text-rose-400" title="Cancel">
                <X size={12} />
              </button>
            </div>
          ) : (
            <span className="flex-1 truncate tracking-tight">{c.title}</span>
          )}

          {/* Action buttons on hover */}
          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePinConversation(c.id);
                }}
                className={cn(
                  'p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-700/60 transition',
                  c.isPinned && 'text-indigo-400 opacity-100'
                )}
                title={c.isPinned ? 'Unpin chat' : 'Pin chat'}
              >
                <Pin size={12} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTaggingId(isTagging ? null : c.id);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition"
                title="Manage tags"
              >
                <Tag size={12} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(c);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition"
                title="Rename chat"
              >
                <Edit2 size={12} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingId(c.id);
                }}
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition"
                title="Delete chat"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Tags pills */}
        {c.tags && c.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 pl-5">
            {c.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700"
              >
                #{t}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(c, t);
                  }}
                  className="hover:text-rose-400 text-slate-500"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Inline tag adder */}
        {isTagging && (
          <div
            className="flex items-center gap-1 mt-2 pl-5"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTag(c);
                if (e.key === 'Escape') setTaggingId(null);
              }}
              placeholder="Tag name (Enter)..."
              autoFocus
              className="flex-1 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] text-white focus:outline-none"
            />
            <button
              onClick={() => handleAddTag(c)}
              className="p-0.5 text-[10px] text-indigo-400 hover:underline"
            >
              Add
            </button>
            <button
              onClick={() => setTaggingId(null)}
              className="p-0.5 text-[10px] text-slate-500 hover:underline"
            >
              Done
            </button>
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950/95 border-r border-slate-800 w-64 select-none">
      {/* New Chat Button */}
      <div className="p-3 border-b border-slate-800/80">
        <button
          type="button"
          onClick={() => {
            onNewConversation();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 px-3 text-xs font-semibold text-white shadow-md transition-all active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, messages, tags..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Import / Export Feedback banner */}
      {importStatus && (
        <div
          className={cn(
            'mx-3 p-2 rounded-lg text-[11px] mb-2 border transition',
            importStatus.isError
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          )}
        >
          {importStatus.message}
        </div>
      )}

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4">
        {pinnedConversations.length > 0 && (
          <div>
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Pin size={10} />
              <span>Pinned ({pinnedConversations.length})</span>
            </div>
            <div className="space-y-0.5">{pinnedConversations.map(renderConversationItem)}</div>
          </div>
        )}

        <div>
          {pinnedConversations.length > 0 && (
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Recent
            </div>
          )}
          {recentConversations.length > 0 ? (
            <div className="space-y-0.5">{recentConversations.map(renderConversationItem)}</div>
          ) : (
            pinnedConversations.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">
                {searchQuery ? 'No matching conversations.' : 'No conversations yet.'}
              </div>
            )
          )}
        </div>
      </div>

      {/* Hidden file input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Bottom Profile / Utility Bar */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 space-y-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleExportChats}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
            title="Download JSON backup"
          >
            <Download size={13} />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
            title="Import JSON backup"
          >
            <Upload size={13} />
            <span>Import</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
        >
          <Settings size={14} />
          <span>Settings & Status</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
              <AlertTriangle size={16} />
              <span>Confirm Delete Conversation</span>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteConversation(deletingId);
                  setDeletingId(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0">{sidebarContent}</div>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
