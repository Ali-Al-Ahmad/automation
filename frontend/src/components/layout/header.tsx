import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileNav } from './mobile-nav';

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-6">
      <MobileNav />
      <Link
        href="/dashboard"
        className="font-semibold md:hidden"
      >
        Telegram Scheduler
      </Link>
      <div className="ml-auto">
        <Button asChild size="sm">
          <Link href="/messages/new">
            <Plus className="h-4 w-4" />
            New message
          </Link>
        </Button>
      </div>
    </header>
  );
}
