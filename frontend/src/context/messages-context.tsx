'use client';

import {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from '@/context/auth-context';
import { useChats } from '@/context/chats-context';
import { MESSAGES_PAGE_SIZE, fetchMessages, markChatAsRead } from '@/lib/chat-service';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { Chat, Message, SendAck, SocketError } from '@/types';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface PendingMessage {
  chatId: string;
  content: string;
}

interface MessagesContextValue {
  status: ConnectionStatus;
  messagesByChat: Record<string, Message[]>;
  hasMoreByChat: Record<string, boolean>;
  loadingChatId: string | null;
  loadingOlderChatId: string | null;
  sendingChatId: string | null;
  error: string | null;
  openChat: (chatId: string) => Promise<void>;
  loadOlder: (chatId: string) => Promise<number>;
  closeChat: (chatId: string) => void;
  sendMessage: (chatId: string, content: string) => Promise<boolean>;
  clearError: () => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

function mergeMessages(...lists: Message[][]) {
  const byId = new Map<string, Message>();
  lists.flat().forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { addChat, registerIncomingMessage, clearUnread } = useChats();

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [hasMoreByChat, setHasMoreByChat] = useState<Record<string, boolean>>({});
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const [loadingOlderChatId, setLoadingOlderChatId] = useState<string | null>(null);
  const [sendingChatId, setSendingChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMessage | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const activeChatRef = useRef<string | null>(null);
  const loadedChatsRef = useRef<Set<string>>(new Set());

  const appendMessage = useCallback((message: Message) => {
    setMessagesByChat((prev) => {
      const current = prev[message.chatId] ?? [];
      if (current.some((item) => item.id === message.id)) return prev;
      return { ...prev, [message.chatId]: [...current, message] };
    });
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    const handleConnect = () => {
      setStatus('connected');
      setError(null);
      const activeId = activeChatRef.current;
      if (activeId) {
        fetchMessages(token, activeId)
          .then((fetched) => {
            loadedChatsRef.current.add(activeId);
            setMessagesByChat((prev) => ({
              ...prev,
              [activeId]: mergeMessages(fetched, prev[activeId] ?? []),
            }));
          })
          .catch(() => setError('No se pudo sincronizar el historial del chat'));
      }
    };
    const handleDisconnect = () => setStatus('disconnected');
    const handleConnectError = () => setStatus('disconnected');
    const handleReconnectAttempt = () => setStatus('connecting');
    const handleNewMessage = (message: Message) => {
      appendMessage(message);
      const chatIsOpen = activeChatRef.current === message.chatId;
      registerIncomingMessage(message, chatIsOpen);
      if (chatIsOpen) markChatAsRead(token, message.chatId).catch(() => undefined);
    };
    const handleNewChat = (chat: Chat) => addChat(chat);
    const handleException = (payload: SocketError) => setError(payload.message);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('message:new', handleNewMessage);
    socket.on('chat:new', handleNewChat);
    socket.on('exception', handleException);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    if (socket.connected) setStatus('connected');

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('message:new', handleNewMessage);
      socket.off('chat:new', handleNewChat);
      socket.off('exception', handleException);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, [token, appendMessage, registerIncomingMessage, addChat]);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      socketRef.current = null;
      activeChatRef.current = null;
      loadedChatsRef.current = new Set();
      setMessagesByChat({});
      setHasMoreByChat({});
      setPending(null);
      setStatus('disconnected');
    }
  }, [token]);

  const openChat = useCallback(
    async (chatId: string) => {
      activeChatRef.current = chatId;
      clearUnread(chatId);
      if (!token) return;

      markChatAsRead(token, chatId).catch(() => undefined);

      if (loadedChatsRef.current.has(chatId)) return;

      setLoadingChatId(chatId);
      try {
        const fetched = await fetchMessages(token, chatId);
        loadedChatsRef.current.add(chatId);
        setHasMoreByChat((prev) => ({ ...prev, [chatId]: fetched.length === MESSAGES_PAGE_SIZE }));
        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: mergeMessages(fetched, prev[chatId] ?? []),
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los mensajes');
      } finally {
        setLoadingChatId(null);
      }
    },
    [token, clearUnread],
  );

  const loadOlder = useCallback(
    async (chatId: string) => {
      const oldest = messagesByChat[chatId]?.[0];
      if (!token || !oldest || loadingOlderChatId) return 0;

      setLoadingOlderChatId(chatId);
      try {
        const older = await fetchMessages(token, chatId, { before: oldest.createdAt });
        setHasMoreByChat((prev) => ({ ...prev, [chatId]: older.length === MESSAGES_PAGE_SIZE }));
        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: mergeMessages(older, prev[chatId] ?? []),
        }));
        return older.length;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los mensajes anteriores');
        return 0;
      } finally {
        setLoadingOlderChatId(null);
      }
    },
    [token, messagesByChat, loadingOlderChatId],
  );

  const closeChat = useCallback((chatId: string) => {
    if (activeChatRef.current === chatId) activeChatRef.current = null;
  }, []);

  const sendMessage = useCallback(
    (chatId: string, content: string) =>
      new Promise<boolean>((resolve) => {
        const socket = socketRef.current;

        if (!socket?.connected) {
          setPending({ chatId, content });
          setError('Sin conexión. Se enviará cuando vuelvas a estar en línea.');
          resolve(true);
          return;
        }

        setSendingChatId(chatId);
        socket.timeout(5000).emit(
          'message:send',
          { chatId, content },
          (timeoutError: Error | null, ack: SendAck) => {
            setSendingChatId(null);
            if (timeoutError || !ack?.ok) {
              setError('El mensaje no se pudo enviar. Inténtalo de nuevo.');
              resolve(false);
              return;
            }
            resolve(true);
          },
        );
      }),
    [],
  );

  useEffect(() => {
    if (status !== 'connected' || !pending) return;
    const { chatId, content } = pending;
    setPending(null);
    sendMessage(chatId, content);
  }, [status, pending, sendMessage]);

  const value = useMemo(
    () => ({
      status,
      messagesByChat,
      hasMoreByChat,
      loadingChatId,
      loadingOlderChatId,
      sendingChatId,
      error,
      openChat,
      loadOlder,
      closeChat,
      sendMessage,
      clearError: () => setError(null),
    }),
    [
      status, messagesByChat, hasMoreByChat, loadingChatId, loadingOlderChatId,
      sendingChatId, error, openChat, loadOlder, closeChat, sendMessage,
    ],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) throw new Error('useMessages debe usarse dentro de MessagesProvider');
  return context;
}