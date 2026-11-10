import { formatTime } from '@/lib/chat-utils';
import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  return (
    <div className={`flex animate-fade-in-up ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {showSender && !isOwn && (
          <span className="mb-1 px-3 text-xs font-medium text-accent-400">{message.sender.name}</span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-lg ${
            isOwn
              ? 'rounded-br-md bg-linear-to-br from-brand-500 to-accent-500 text-white shadow-brand-500/20'
              : 'rounded-bl-md border border-white/10 bg-white/5 text-slate-100'
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
        </div>
        <span className="mt-1 px-3 text-[11px] text-slate-500">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
}