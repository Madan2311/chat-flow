"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { MessageBubble } from "@/components/chat/message-bubble";
import { useAuth } from "@/context/auth-context";
import { useChats } from "@/context/chats-context";
import { useMessages } from "@/context/messages-context";
import { getChatTitle, getMemberNames } from "@/lib/chat-utils";
import Link from "next/link";
import { ArrowLeft, SendHorizontal } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

const MAX_LENGTH = 2000;

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { chats, isLoading: chatsLoading } = useChats();
  const {
    status,
    messagesByChat,
    loadingChatId,
    sendingChatId,
    error,
    openChat,
    closeChat,
    sendMessage,
    clearError,
  } = useMessages();

  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const chat = chats.find((item) => item.id === id);
  const chatExists = Boolean(chat);
  const messages = messagesByChat[id] ?? [];
  const isLoadingHistory = loadingChatId === id;
  const isSending = sendingChatId === id;

  useEffect(() => {
    if (!chatExists) return;
    openChat(id);
    return () => closeChat(id);
  }, [id, chatExists, openChat, closeChat]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending || content.length > MAX_LENGTH) return;

    setDraft("");
    const sent = await sendMessage(id, content);
    if (!sent) setDraft(content);
  };

  if (chatsLoading) {
    return (
      <div className="space-y-4 p-8">
        <div className="skeleton h-8 w-48 rounded-full" />
        <div className="skeleton h-4 w-72 rounded-full" />
      </div>
    );
  }

  if (!chat) {
    return (
      <p className="p-8 text-slate-400">
        Este chat no existe o no tienes acceso.
      </p>
    );
  }

  const showSenderFor = (index: number) =>
    chat.isGroup &&
    (index === 0 ||
      messages[index - 1].sender.id !== messages[index].sender.id);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 p-4 md:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/chat"
            aria-label="Cerrar conversación"
            className="rounded-xl p-2 text-slate-300 transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-100">
              {getChatTitle(chat, user?.id ?? "")}
            </h2>
            <p className="truncate text-xs text-slate-400">
              {chat.isGroup
                ? getMemberNames(chat, user?.id ?? "")
                : "Chat directo"}
            </p>
          </div>
        </div>
        <span
          className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs ${
            status === "connected"
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-rose-500/10 text-rose-300"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              status === "connected"
                ? "animate-pulse-soft bg-emerald-400"
                : "bg-rose-400"
            }`}
          />
          {status === "connected"
            ? "En línea"
            : status === "connecting"
              ? "Conectando…"
              : "Sin conexión"}
        </span>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6"
      >
        {isLoadingHistory &&
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={`skeleton h-12 w-2/3 rounded-2xl ${index % 2 ? "ml-auto" : ""}`}
            />
          ))}

        {!isLoadingHistory && messages.length === 0 && (
          <p className="pt-12 text-center text-sm text-slate-500">
            Aún no hay mensajes. ¡Escribe el primero!
          </p>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender.id === user?.id}
            showSender={showSenderFor(index)}
          />
        ))}
      </div>

      {error && (
        <div
          role="alert"
          onClick={clearError}
          className="mx-6 mb-3 cursor-pointer animate-fade-in-up rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-3 border-t border-white/10 p-3 md:p-4"
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            const isDesktop = window.matchMedia("(min-width: 768px)").matches;
            if (isDesktop && event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          disabled={isSending}
          rows={1}
          maxLength={MAX_LENGTH + 1}
          placeholder="Escribe un mensaje…"
          className="max-h-32 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-300 focus:border-accent-400/50 focus:bg-white/10 focus:ring-2 focus:ring-accent-400/30 disabled:opacity-60"
        />

        <button
          type="submit"
          aria-label="Enviar mensaje"
          disabled={!draft.trim() || status !== "connected" || isSending}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/30 transition-all duration-300 hover:brightness-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
        >
          {isSending ? <Spinner /> : <SendHorizontal size={20} />}
        </button>
      </form>
    </div>
  );
}
