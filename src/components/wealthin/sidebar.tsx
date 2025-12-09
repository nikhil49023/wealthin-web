
'use client';

import {
  Home,
  Wallet,
  LogOut,
  User,
  BrainCircuit,
  Rocket,
  Globe,
  MessagesSquare,
  DollarSign,
  AreaChart,
} from 'lucide-react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {useLanguage} from '@/hooks/use-language';
import {useAuth} from '@/context/auth-provider';

type SidebarProps = {
  onLinkClick?: () => void;
  isCollapsed?: boolean;
};

export default function Sidebar({
  onLinkClick,
  isCollapsed = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {language, setLanguage, translations} = useLanguage();
  const {signOut, userProfile} = useAuth();

  const isMsme = userProfile?.role === 'msme';

  const navItems = [
    {href: '/', label: translations.sidebar.dashboard, icon: Home},
    {
      href: '/funds',
      label: 'Funds',
      icon: DollarSign,
    },
    {
      href: '/brainstorm',
      label: translations.sidebar.brainstorm,
      icon: BrainCircuit,
    },
    {
      href: '/ai-advisor',
      label: 'AI Advisor',
      icon: MessagesSquare,
    },
    {
      href: '/launchpad',
      label: isMsme
        ? translations.sidebar.growthHub
        : translations.sidebar.launchpad,
      icon: Rocket,
    },
  ];

  const handleLogout = () => {
    signOut();
    router.push('/login');
  };

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  const NavLink = ({item}: {item: (typeof navItems)[0]}) => {
    const isActive = pathname === item.href;
    const linkContent = (
      <>
        <item.icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
        <span className={cn({'hidden': isCollapsed})}>{item.label}</span>
      </>
    );

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              asChild
              className={cn(
                'w-full justify-start text-base font-normal text-muted-foreground hover:text-primary hover:bg-primary/10',
                isActive && 'font-semibold text-primary bg-primary/10',
                isCollapsed && 'justify-center'
              )}
              onClick={handleLinkClick}
            >
              <Link href={item.href}>{linkContent}</Link>
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <aside className="w-full h-full glassmorphic flex flex-col p-4">
      <div
        className={cn(
          'flex items-center gap-2 p-2',
          isCollapsed ? 'justify-center' : 'justify-start'
        )}
      >
        <div className={cn("flex items-center justify-center h-10 w-10 text-primary", isCollapsed && "h-12 w-12")}>
            <Wallet className="h-8 w-8" />
        </div>
        <h1 className={cn('text-xl font-bold', {'hidden': isCollapsed})}>
          Fin-Box
        </h1>
      </div>
      <nav className="flex-1 px-0 py-2 space-y-1 mt-4">
        {navItems.map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
      <div className={cn('border-t', isCollapsed ? 'p-0' : 'p-4')}>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start text-muted-foreground font-normal hover:text-primary hover:bg-primary/10',
                      isCollapsed && 'justify-center'
                    )}
                  >
                    <Globe className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                    <span className={cn({'hidden': isCollapsed})}>
                      {language === 'en' ? 'English' : 'తెలుగు'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setLanguage('en')}>
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage('te')}>
                    తెలుగు
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <p>Language</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                asChild
                className={cn(
                  'w-full justify-start text-muted-foreground font-normal hover:text-primary hover:bg-primary/10',
                  isCollapsed && 'justify-center'
                )}
                onClick={handleLinkClick}
              >
                <Link href="/profile">
                  <User className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                  <span className={cn({'hidden': isCollapsed})}>
                    {translations.sidebar.myProfile}
                  </span>
                </Link>
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <p>{translations.sidebar.myProfile}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10',
                      isCollapsed && 'justify-center'
                    )}
                  >
                    <LogOut className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                    <span className={cn({'hidden': isCollapsed})}>
                      {translations.sidebar.logout}
                    </span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {translations.logoutDialog.title}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {translations.logoutDialog.description}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {translations.logoutDialog.cancel}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>
                      {translations.logoutDialog.confirm}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <p>{translations.sidebar.logout}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
}
