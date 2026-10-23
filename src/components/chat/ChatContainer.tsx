'use client';

import React, { useRef, useEffect } from 'react';
import { Message } from '@/types/chat';
import { ProviderId } from '@/types/provider';
import { MessageBubble } from './MessageBubble';
import { WelcomeScreen } from './WelcomeScreen';

interface ChatContainerProps {
  messages: Message[];
  onRetryMessage: (messageId: string) => void;
  onSelectStarterPrompt: (prompt: string, provider?: ProviderId, model?: string) => void;
  mockMode: boolean;
  showCostEstimates?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onRetryMessage,
  onSelectStarterPrompt,
  mockMode,
  showCostEstimates = true,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, lastMessageContent]);

  if (messages.length === 0) {
    return (
      <WelcomeScreen
        onSelectPrompt={onSelectStarterPrompt}
        mockMode={mockMode}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full">
      <div className="flex flex-col min-h-full">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onRetry={onRetryMessage}
            showCostEstimates={showCostEstimates}
          />
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};
