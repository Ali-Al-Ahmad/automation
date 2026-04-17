import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="text-sm text-muted-foreground md:hidden">
        <Link href="/dashboard" className="font-semibold text-foreground">
          Telegram Scheduler
        </Link>
      </div>
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
