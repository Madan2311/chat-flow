import { AuroraBackground } from '@/components/aurora-background';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuroraBackground>
      <main className="flex min-h-screen items-center justify-center p-6">{children}</main>
    </AuroraBackground>
  );
}