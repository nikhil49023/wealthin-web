
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, BrainCircuit, Rocket, MessagesSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/context/auth-provider';

export default function BottomNavbar() {
  const pathname = usePathname();
  const { translations } = useLanguage();
  const { user, userProfile } = useAuth();
  const isMsme = userProfile?.role === 'msme';

  const navItems = [
    { href: '/', label: translations.sidebar.dashboard, icon: Home },
    { href: '/transactions', label: translations.sidebar.transactions, icon: Wallet },
    { href: '/ai-advisor', label: 'AI', icon: MessagesSquare },
    { href: '/brainstorm', label: translations.sidebar.brainstorm, icon: BrainCircuit },
    { href: '/launchpad', label: isMsme ? translations.sidebar.growthHub : translations.sidebar.launchpad, icon: Rocket },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-card border-t print:hidden">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex flex-col items-center justify-center px-5 hover:bg-accent group"
            >
              <item.icon
                className={cn(
                  'w-6 h-6 text-muted-foreground group-hover:text-primary',
                  isActive && 'text-primary'
                )}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
