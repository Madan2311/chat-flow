import { api } from '@/lib/api';
import { Chat, User, Message } from '@/types';

export const fetchUsers = (token: string) => api<User[]>('/users', { token });

export const fetchChats = (token: string) => api<Chat[]>('/chats', { token });

export const createChat = (token: string, body: { participantIds: string[]; name?: string }) =>
  api<Chat>('/chats', { method: 'POST', token, body: JSON.stringify(body) });

export const fetchMessages = (token: string, chatId: string) =>
  api<Message[]>(`/chats/${chatId}/messages?limit=50`, { token });

export const markChatAsRead = (token: string, chatId: string) =>
  api<{ ok: boolean }>(`/chats/${chatId}/read`, { method: 'POST', token });