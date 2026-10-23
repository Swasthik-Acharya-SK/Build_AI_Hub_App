'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, UserSettings, Role } from '@/types/chat';
import { ProviderId } from '@/types/provider';
import {
  getStoredSettings,
  saveStoredSettings,
  getStoredConversations,
  saveStoredConversations,
  getStoredActiveId,
  saveStoredActiveId,
  createNewConversation,
  DEFAULT_SETTINGS,
} from '@/lib/storage/chat-store';
import { calculateEstimatedCost } from '@/lib/ai/providers';
import { streamMockResponse } from '@/lib/ai/mock';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ChatInput } from '@/components/chat/ChatInput';
import { CompareArena } from '@/components/compare/CompareArena';
import { SettingsModal } from '@/components/settings/SettingsModal';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<'chat' | 'compare'>('chat');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize client state from localStorage
  useEffect(() => {
    setIsClient(true);
    const loadedSettings = getStoredSettings();
    setSettings(loadedSettings);

    // Apply theme
    if (loadedSettings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    const loadedConversations = getStoredConversations();
    if (loadedConversations.length > 0) {
      setConversations(loadedConversations);
      const lastActive = getStoredActiveId();
      const matched = loadedConversations.find((c) => c.id === lastActive);
      setActiveId(matched ? matched.id : loadedConversations[0].id);
    } else {
      const defaultConvo = createNewConversation(
        loadedSettings.defaultProvider,
        loadedSettings.defaultModel
      );
      setConversations([defaultConvo]);
      setActiveId(defaultConvo.id);
      saveStoredConversations([defaultConvo]);
      saveStoredActiveId(defaultConvo.id);
    }
  }, []);

  // Save changes to localStorage whenever conversations update
  useEffect(() => {
    if (isClient && conversations.length > 0) {
      saveStoredConversations(conversations);
    }
  }, [conversations, isClient]);

  // Save activeId
  useEffect(() => {
    if (isClient) {
      saveStoredActiveId(activeId);
    }
  }, [activeId, isClient]);

  const activeConversation = conversations.find((c) => c.id === activeId) || conversations[0];

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);

    if (newSettings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    handleUpdateSettings({ ...settings, theme: nextTheme });
  };

  const handleToggleMockMode = () => {
    handleUpdateSettings({ ...settings, mockMode: !settings.mockMode });
  };

  const handleNewConversation = (
    provider: ProviderId = settings.defaultProvider,
    model: string = settings.defaultModel
  ) => {
    const newConvo = createNewConversation(provider, model);
    setConversations((prev) => [newConvo, ...prev]);
    setActiveId(newConvo.id);
    setCurrentMode('chat');
  };

  const handleDeleteConversation = (id: string) => {
    const remaining = conversations.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      const fresh = createNewConversation(settings.defaultProvider, settings.defaultModel);
      setConversations([fresh]);
      setActiveId(fresh.id);
    } else {
      setConversations(remaining);
      if (activeId === id) {
        setActiveId(remaining[0].id);
      }
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  const handleTogglePinConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const handleUpdateTags = (id: string, tags: string[]) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, tags, updatedAt: Date.now() } : c))
    );
  };

  const handleImportConversations = (imported: Conversation[]) => {
    setConversations((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const fresh = imported.filter((c) => !existingIds.has(c.id));
      const merged = [...fresh, ...prev];
      saveStoredConversations(merged);
      return merged;
    });
    if (imported.length > 0) {
      setActiveId(imported[0].id);
      setCurrentMode('chat');
    }
  };

  const handleClearAllConversations = () => {
    const fresh = createNewConversation(settings.defaultProvider, settings.defaultModel);
    setConversations([fresh]);
    setActiveId(fresh.id);
    saveStoredConversations([fresh]);
  };

  const handleSelectModel = (provider: ProviderId, modelId: string) => {
    if (!activeConversation) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, provider, model: modelId, updatedAt: Date.now() }
          : c
      )
    );
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleSendMessage = async (promptText: string) => {
    if (!activeConversation || isStreaming) return;

    // 1. Create and append user message
    const userMessage: Message = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: Date.now(),
      status: 'completed',
    };

    // Auto-title conversation if this is the first message
    let updatedTitle = activeConversation.title;
    if (activeConversation.messages.length === 0 || activeConversation.title === 'New Chat') {
      updatedTitle = promptText.length > 36 ? promptText.substring(0, 36) + '...' : promptText;
    }

    const assistantMsgId = `msg_asst_${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      provider: activeConversation.provider,
      model: activeConversation.model,
      timestamp: Date.now(),
      status: 'streaming',
    };

    const updatedMessages = [...activeConversation.messages, userMessage, assistantPlaceholder];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              title: updatedTitle,
              messages: updatedMessages,
              updatedAt: Date.now(),
            }
          : c
      )
    );

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTime = Date.now();
    let accumulatedText = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeConversation.provider,
          model: activeConversation.model,
          messages: updatedMessages
            .filter((m) => m.id !== assistantMsgId)
            .map((m) => ({ role: m.role, content: m.content })),
          systemPrompt: activeConversation.systemPrompt || settings.systemPrompt,
          temperature: activeConversation.temperature || settings.temperature,
          stream: true,
          mockMode: settings.mockMode,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable response stream.');

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversation.id) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
              ),
            };
          })
        );
      }

      const durationMs = Date.now() - startTime;
      const promptTokens = Math.ceil(promptText.length / 4);
      const completionTokens = Math.ceil(accumulatedText.length / 4);
      const cost = calculateEstimatedCost(
        activeConversation.model,
        promptTokens,
        completionTokens
      );

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversation.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    status: 'completed',
                    metrics: {
                      durationMs,
                      promptTokens,
                      completionTokens,
                      totalTokens: promptTokens + completionTokens,
                      estimatedCost: cost,
                      tokensPerSec: durationMs > 0 ? (completionTokens / (durationMs / 1000)) : 0,
                    },
                  }
                : m
            ),
          };
        })
      );
    } catch (err: any) {
      if (controller.signal.aborted) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversation.id) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, status: 'completed', content: accumulatedText ? (accumulatedText + ' [Generation stopped]') : '[Generation cancelled]' }
                  : m
              ),
            };
          })
        );
      } else {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversation.id) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, status: 'error', error: err?.message || 'Failed to stream response.' }
                  : m
              ),
            };
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetryMessage = (messageId: string) => {
    if (!activeConversation) return;
    const msgIdx = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIdx === -1) return;

    // Find the preceding user message
    let userPrompt = '';
    for (let i = msgIdx - 1; i >= 0; i--) {
      if (activeConversation.messages[i].role === 'user') {
        userPrompt = activeConversation.messages[i].content;
        break;
      }
    }

    if (!userPrompt) return;

    // Remove this message and subsequent messages
    const trimmed = activeConversation.messages.slice(0, msgIdx);
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, messages: trimmed } : c))
    );

    // Re-send user prompt
    handleSendMessage(userPrompt);
  };

  const handleSelectStarterPrompt = (
    prompt: string,
    provider?: ProviderId,
    model?: string
  ) => {
    if (provider && model && activeConversation) {
      handleSelectModel(provider, model);
    }
    handleSendMessage(prompt);
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-indigo-500 animate-ping" />
          <span className="text-sm font-medium">Loading All-in-One AI Hub...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={(id) => {
          setActiveId(id);
          setCurrentMode('chat');
        }}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePinConversation}
        onUpdateTags={handleUpdateTags}
        onImportConversations={handleImportConversations}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
          currentModelId={activeConversation?.model || settings.defaultModel}
          onSelectModel={handleSelectModel}
          mockMode={settings.mockMode}
          onToggleMockMode={handleToggleMockMode}
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Workspace Body */}
        {currentMode === 'compare' ? (
          <CompareArena
            mockMode={settings.mockMode}
            showCostEstimates={settings.showCostEstimates}
          />
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <ChatContainer
              messages={activeConversation?.messages || []}
              onRetryMessage={handleRetryMessage}
              onSelectStarterPrompt={handleSelectStarterPrompt}
              mockMode={settings.mockMode}
              showCostEstimates={settings.showCostEstimates}
            />

            <ChatInput
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              isStreaming={isStreaming}
              currentModelId={activeConversation?.model || settings.defaultModel}
              onSelectModel={handleSelectModel}
            />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
        onClearAllConversations={handleClearAllConversations}
      />
    </div>
  );
}
