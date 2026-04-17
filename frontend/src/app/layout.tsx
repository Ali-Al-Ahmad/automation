import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from '@/components/layout/app-shell';
import { QueryProvider } from '@/components/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Telegram Scheduler',
  description: 'Schedule and automate Telegram messages.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>
          <TooltipProvider delayDuration={200}>
            <AppShell>{children}</AppShell>
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
