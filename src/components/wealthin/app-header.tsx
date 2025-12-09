
'use client';

import { useAuth } from '@/context/auth-provider';
import { Avatar, AvatarFallback } from '../ui/avatar';
import Link from 'next/link';
import { Wallet } from 'lucide-react';

export default function AppHeader() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between border-b glassmorphic px-2 sm:px-4 print:hidden">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-10 w-10 text-primary">
            <Wallet className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Fin-Box</h1>
        </div>
      </div>
      <Link href="/profile">
         <Avatar className="h-9 w-9 border-2 border-primary/50">
            <AvatarFallback className="text-sm bg-muted">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
      </Link>
    </header>
  );
}
