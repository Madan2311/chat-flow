"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuroraBackground } from "@/components/aurora-background";
import { ConnectionBanner } from "@/components/connection-banner";
import { ChatsProvider } from "@/context/chats-context";
import { MessagesProvider } from "@/context/messages-context";
import { useAuth } from "@/context/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <AuroraBackground>
        <div className="flex min-h-screen items-center justify-center">
          <div className="skeleton h-12 w-12 rounded-full" />
        </div>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <ChatsProvider>
        <MessagesProvider>
          <ConnectionBanner />
          {children}
        </MessagesProvider>
      </ChatsProvider>
    </AuroraBackground>
  );
}
