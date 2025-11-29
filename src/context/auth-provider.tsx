
'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const auth = getAuth(app);
const db = getFirestore(app);

export type CreditTransaction = {
    amount: number; // positive for earning, negative for spending
    description: string;
    date: any;
};

export type UserProfile = {
  uid: string;
  displayName: string | null;
  email: string | null;
  role: 'individual' | 'msme';
  createdAt: any;
  credits?: number;
  msmeName?: string;
  msmeDescription?: string;
  msmeService?: string;
  msmeLocation?: string;
  ownerContact?: string;
  msmeWebsite?: string;
  hasCompletedTour?: boolean;
  creditHistory?: CreditTransaction[];
  lastSavingsRateCreditAwarded?: any;
  completedGoals?: string[];
};

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const unsubProfile = onSnapshot(userDocRef, (snapshot) => {
            if (snapshot.exists()) {
                const profileData = snapshot.data() as UserProfile;
                // Check if existing user has credits, if not, grant them.
                if (profileData.credits === undefined) {
                    const updatedProfile = {
                        ...profileData,
                        credits: 20,
                        creditHistory: [
                            ...(profileData.creditHistory || []),
                            {
                                amount: 20,
                                description: 'Welcome Bonus!',
                                date: serverTimestamp()
                            }
                        ]
                    };
                    updateDoc(userDocRef, { 
                        credits: 20, 
                        creditHistory: updatedProfile.creditHistory
                    });
                    setUserProfile(updatedProfile);
                } else {
                    setUserProfile(profileData);
                }
            } else {
                getDoc(userDocRef).then(docSnap => {
                    if (!docSnap.exists()) {
                        const newProfile: UserProfile = {
                            uid: firebaseUser.uid,
                            displayName: firebaseUser.displayName,
                            email: firebaseUser.email,
                            role: 'individual', // default role
                            createdAt: serverTimestamp(),
                            credits: 20,
                            hasCompletedTour: false,
                            creditHistory: [{
                                amount: 20,
                                description: 'Welcome Bonus!',
                                date: serverTimestamp()
                            }],
                            completedGoals: [],
                        };
                        setDoc(userDocRef, newProfile);
                        setUserProfile(newProfile);
                    }
                });
            }
        });
        
        if (pathname === '/login' || pathname === '/signup') {
          router.replace('/');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        const isPublicPage = pathname === '/login' || pathname === '/signup';
        if (!isPublicPage) {
          router.replace('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = { user, userProfile, loading, signOut };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
