'use client';

import {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { useAuth } from '@/context/auth-context';
import { fetchChats } from '@/lib/chat-service';
import { Chat, Message } from '@/types';

interface ChatsContextValue {
  chats: Chat[];
  isLoading: boolean;
  addChat: (chat: Chat) => void;
  registerIncomingMessage: (message: Message, chatIsOpen: boolean) => void;
  clearUnread: (chatId: string) => void;
}

const ChatsContext = createContext<ChatsContextValue | null>(null);

export function ChatsProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const userId = user?.id;
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      setChats(await fetchChats(token));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addChat = useCallback((chat: Chat) => {
    setChats((prev) => (prev.some((item) => item.id === chat.id) ? prev : [chat, ...prev]));
  }, []);

  const registerIncomingMessage = useCallback(
    (message: Message, chatIsOpen: boolean) => {
      const isOwn = message.sender.id === userId;
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== message.chatId) return chat;
          const unread = chat.unreadCount ?? 0;
          return {
            ...chat,
            lastMessage: message,
            unreadCount: !isOwn && !chatIsOpen ? unread + 1 : unread,
          };
        }),
      );
    },
    [userId],
  );

  const clearUnread = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId && chat.unreadCount ? { ...chat, unreadCount: 0 } : chat,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({ chats, isLoading, addChat, registerIncomingMessage, clearUnread }),
    [chats, isLoading, addChat, registerIncomingMessage, clearUnread],
  );

  return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
}

export function useChats() {
  const context = useContext(ChatsContext);
  if (!context) throw new Error('useChats debe usarse dentro de ChatsProvider');
  return context;
}