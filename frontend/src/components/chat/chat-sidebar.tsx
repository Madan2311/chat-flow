'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogOut, MessageSquarePlus } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useChats } from '@/context/chats-context';
import { formatTime, getChatTitle } from '@/lib/chat-utils';
import { Chat } from '@/types';
import { NewChatModal } from './new-chat-modal';

interface ChatSidebarProps {
  className?: string;
}

function buildPreview(chat: Chat, userId: string) {
  const last = chat.lastMessage;
  if (!last) return chat.isGroup ? `${chat.participants.length} participantes` : 'Sin mensajes';
  if (last.sender.id === userId) return `Tú: ${last.content}`;
  if (chat.isGroup) return `${last.sender.name}: ${last.content}`;
  return last.content;
}

export function ChatSidebar({ className = 'flex' }: ChatSidebarProps) {
  const { user, logout } = useAuth();
  const { chats, isLoading } = useChats();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const userId = user?.id ?? '';

  // Como WhatsApp: el chat con actividad más reciente aparece primero
  const sorted = [...chats].sort((a, b) => {
    const aTime = new Date(a.lastMessage?.createdAt ?? a.createdAt).getTime();
    const bTime = new Date(b.lastMessage?.createdAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });

  return (
    <aside
      className={`${className} glass w-full shrink-0 flex-col overflow-hidden rounded-3xl md:w-80`}
    >
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">Conectado como</p>
          <p className="truncate font-semibold text-slate-100">{user?.name}</p>
        </div>
        <button
          onClick={logout}
          aria-label="Cerrar sesión"
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-rose-300"
        >
          <LogOut size={18} />
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-500 to-accent-500 px-4 py-2.5 font-medium text-white shadow-lg shadow-brand-500/30 transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <MessageSquarePlus size={18} />
          Nuevo chat
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton mx-1 h-16 rounded-xl" />
          ))}

        {!isLoading && sorted.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-slate-500">Aún no tienes chats</p>
        )}

        {!isLoading &&
          sorted.map((chat) => {
            const href = `/chat/${chat.id}`;
            const active = pathname === href;
            const unread = chat.unreadCount ?? 0;

            return (
              <Link
                key={chat.id}
                href={href}
                className={`flex animate-fade-in-up items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 ${
                  active ? 'bg-white/10 shadow-inner' : 'hover:bg-white/5'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-100">
                    {getChatTitle(chat, userId)}
                  </p>
                  <p
                    className={`truncate text-xs ${
                      unread > 0 ? 'font-medium text-slate-100' : 'text-slate-400'
                    }`}
                  >
                    {buildPreview(chat, userId)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  {chat.lastMessage && (
                    <span className="text-[11px] text-slate-500">
                      {formatTime(chat.lastMessage.createdAt)}
                    </span>
                  )}
                  {unread > 0 && (
                    <span className="animate-pulse-soft flex h-5 min-w-5 items-center justify-center rounded-full bg-linear-to-r from-brand-500 to-accent-500 px-1.5 text-[11px] font-semibold text-white shadow-md shadow-brand-500/40">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
      </nav>

      <NewChatModal open={open} onClose={() => setOpen(false)} />
    </aside>
  );
}