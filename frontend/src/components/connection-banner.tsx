'use client';

import { useMessages } from '@/context/messages-context';

export function ConnectionBanner() {
  const { status } = useMessages();
  if (status === 'connected') return null;

  return (
    <div
      role="status"
      className="animate-fade-in-up fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-linear-to-r from-rose-500/90 via-amber-500/90 to-rose-500/90 bg-size-[200%_auto] px-4 py-2 text-sm font-medium text-white shadow-lg animate-gradient"
    >
      <span className="h-2 w-2 animate-pulse-soft rounded-full bg-white" />
      {status === 'connecting'
        ? 'Conectando con el servidor…'
        : 'Sin conexión. Reintentando automáticamente…'}
    </div>
  );
}