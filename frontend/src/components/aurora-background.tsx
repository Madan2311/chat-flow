import { ReactNode } from 'react';

export function AuroraBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/60 blur-3xl animate-blob" />
        <div className="absolute -right-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-accent-500/30 blur-3xl animate-blob [animation-delay:4s]" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-rose-400/25 blur-3xl animate-blob [animation-delay:8s]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}