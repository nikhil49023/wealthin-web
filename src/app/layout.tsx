'use client';

import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import Sidebar from '@/components/wealthin/sidebar';
import {motion, AnimatePresence} from 'framer-motion';
import {usePathname} from 'next/navigation';
import {Inter} from 'next/font/google';
import {AuthProvider, useAuth} from '@/context/auth-provider';
import {LanguageProvider} from '@/context/language-provider';
import AppHeader from '@/components/wealthin/app-header';
import DesktopHeader from '@/components/wealthin/desktop-header';
import BottomNavbar from '@/components/wealthin/bottom-navbar';
import {useState, useEffect} from 'react';
import {cn} from '@/lib/utils';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Suspense } from 'react';
import AppTour from '@/components/wealthin/app-tour';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';


const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

function AppContent({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const {user, userProfile} = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  
  useEffect(() => {
    if (userProfile && userProfile.hasCompletedTour === false) {
      // Use a short delay to allow the app to render before showing the tour
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [userProfile]);

  const handleTourComplete = async () => {
    setIsTourOpen(false);
    if (user) {
      const db = getFirestore(app);
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { hasCompletedTour: true }, { merge: true });
    }
  };


  // Special layout for public pages
  const isPublicPage = pathname === '/login' || pathname === '/signup';
  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!isPublicPage && !user) {
    // If not on a public page and not logged in, render nothing (or a loader)
    // as the AuthProvider should handle redirection.
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
       <AppTour isOpen={isTourOpen} onOpenChange={setIsTourOpen} onComplete={handleTourComplete} />
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden md:flex flex-shrink-0 transition-all duration-300 ease-in-out',
          isSidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <Sidebar isCollapsed={isSidebarCollapsed} />
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden print:overflow-visible">
        {/* Mobile Header */}
        <div className="md:hidden">
          <AppHeader />
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <DesktopHeader
            isSidebarCollapsed={isSidebarCollapsed}
            toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none print:overflow-visible pb-16 md:pb-0">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -20}}
                transition={{duration: 0.3}}
                className="w-full max-w-7xl mx-auto"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <BottomNavbar />
      <Toaster />
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>WealthIn</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💸</text></svg>" />
        <meta name="description" content="Your personal finance dashboard." />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body className={`${inter.variable} font-body antialiased`}>
        <LanguageProvider>
          <AuthProvider>
            <Suspense>
              <FirebaseErrorListener />
            </Suspense>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
