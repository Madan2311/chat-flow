import { Chat } from '@/types';

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export function getChatTitle(chat: Chat, currentUserId: string) {
  if (chat.isGroup) return chat.name ?? 'Grupo sin nombre';
  const other = chat.participants.find((participant) => participant.id !== currentUserId);
  return other?.name ?? 'Chat';
}

export function getMemberNames(chat: Chat, currentUserId: string) {
  return chat.participants
    .map((participant) => (participant.id === currentUserId ? 'Tú' : participant.name))
    .sort((a, b) => {
      if (a === 'Tú') return -1;
      if (b === 'Tú') return 1;
      return a.localeCompare(b, 'es');
    })
    .join(', ');
}