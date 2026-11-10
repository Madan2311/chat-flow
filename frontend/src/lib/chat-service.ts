import { api } from '@/lib/api';
import { Chat, Message, User } from '@/types';

export const MESSAGES_PAGE_SIZE = 50;

export const fetchUsers = (token: string) => api<User[]>('/users', { token });

export const fetchChats = (token: string) => api<Chat[]>('/chats', { token });

export const createChat = (token: string, body: { participantIds: string[]; name?: string }) =>
  api<Chat>('/chats', { method: 'POST', token, body: JSON.stringify(body) });

export const fetchMessages = (token: string, chatId: string, options: { before?: string } = {}) => {
  const params = new URLSearchParams({ limit: String(MESSAGES_PAGE_SIZE) });
  if (options.before) params.set('before', options.before);
  return api<Message[]>(`/chats/${chatId}/messages?${params.toString()}`, { token });
};

export const markChatAsRead = (token: string, chatId: string) =>
  api<{ ok: boolean }>(`/chats/${chatId}/read`, { method: 'POST', token });