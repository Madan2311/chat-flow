'use client';

import {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from '@/context/auth-context';
import { useChats } from '@/context/chats-context';
import { fetchMessages, markChatAsRead } from '@/lib/chat-service';
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
  loadingChatId: string | null;
  sendingChatId: string | null;
  error: string | null;
  openChat: (chatId: string) => Promise<void>;
  closeChat: (chatId: string) => void;
  sendMessage: (chatId: string, content: string) => Promise<boolean>;
  clearError: () => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

function mergeMessages(fetched: Message[], current: Message[]) {
  const fetchedIds = new Set(fetched.map((message) => message.id));
  return [...fetched, ...current.filter((message) => !fetchedIds.has(message.id))];
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { addChat, registerIncomingMessage, clearUnread } = useChats();

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
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

  const storeHistory = useCallback((chatId: string, fetched: Message[]) => {
    loadedChatsRef.current.add(chatId);
    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: mergeMessages(fetched, prev[chatId] ?? []),
    }));
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
          .then((fetched) => storeHistory(activeId, fetched))
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
  }, [token, appendMessage, storeHistory, registerIncomingMessage, addChat]);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      socketRef.current = null;
      activeChatRef.current = null;
      loadedChatsRef.current = new Set();
      setMessagesByChat({});
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
        storeHistory(chatId, await fetchMessages(token, chatId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los mensajes');
      } finally {
        setLoadingChatId(null);
      }
    },
    [token, clearUnread, storeHistory],
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
      loadingChatId,
      sendingChatId,
      error,
      openChat,
      closeChat,
      sendMessage,
      clearError: () => setError(null),
    }),
    [status, messagesByChat, loadingChatId, sendingChatId, error, openChat, closeChat, sendMessage],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) throw new Error('useMessages debe usarse dentro de MessagesProvider');
  return context;
}