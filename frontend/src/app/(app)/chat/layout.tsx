'use client';

import { usePathname } from 'next/navigation';
import { ChatSidebar } from '@/components/chat/chat-sidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inConversation = pathname !== '/chat';

  return (
    <div className="flex h-dvh gap-4 p-3 md:p-4">
      <ChatSidebar className={inConversation ? 'hidden md:flex' : 'flex'} />
      <section
        className={`${
          inConversation ? 'flex' : 'hidden md:flex'
        } glass min-w-0 flex-1 flex-col overflow-hidden rounded-3xl`}
      >
        {children}
      </section>
    </div>
  );
}