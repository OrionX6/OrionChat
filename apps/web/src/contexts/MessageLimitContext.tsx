"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useMessageUsage } from '@/hooks/useMessageUsage';

interface MessageLimitContextType {
  canSendMessage: () => boolean;
  incrementUsage: () => void;
  usage: {
    used: number;
    limit: number;
    resetDate: Date;
    isAtLimit: boolean;
    daysUntilReset: number;
  };
  loading: boolean;
  refreshUsage: () => void;
}

const MessageLimitContext = createContext<MessageLimitContextType | undefined>(undefined);

interface MessageLimitProviderProps {
  children: ReactNode;
}

export function MessageLimitProvider({ children }: MessageLimitProviderProps) {
  const messageUsage = useMessageUsage();

  return (
    <MessageLimitContext.Provider value={messageUsage}>
      {children}
    </MessageLimitContext.Provider>
  );
}

export function useMessageLimit() {
  const context = useContext(MessageLimitContext);
  if (context === undefined) {
    throw new Error('useMessageLimit must be used within a MessageLimitProvider');
  }
  return context;
}
