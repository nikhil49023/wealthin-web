
'use client';

import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useAuth } from '@/context/auth-provider';

type DesktopHeaderProps = {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
};

export default function DesktopHeader({ isSidebarCollapsed, toggleSidebar }: DesktopHeaderProps) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between border-b bg-background/80 backdrop-blur-lg px-4 print:hidden">
      <Button variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>
      <div>
        {/* Placeholder for any header content on the right, like user menu or notifications */}
      </div>
    </header>
  );
}
