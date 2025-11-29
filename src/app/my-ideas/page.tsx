
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Lightbulb, Loader2, ChevronsRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import { useLanguage } from '@/hooks/use-language';
import { useRouter } from 'next/navigation';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const db = getFirestore(app);

type SavedIdea = GenerateInvestmentIdeaAnalysisOutput & {
  id: string;
  savedAt: {
    seconds: number;
    nanoseconds: number;
  };
};

export default function MyIdeasPage() {
  const { user, loading: loadingAuth } = useAuth();
  const [ideas, setIdeas] = useState<SavedIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const { translations } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const ideasRef = collection(db, 'users', user.uid, 'savedIdeas');
      const unsubscribe = onSnapshot(ideasRef, (snapshot) => {
        const fetchedIdeas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavedIdea[];
        setIdeas(fetchedIdeas.sort((a, b) => b.savedAt.seconds - a.savedAt.seconds));
        setLoadingIdeas(false);
      },
      async (error) => {
        console.error("My Ideas snapshot error", error);
        const permissionError = new FirestorePermissionError({
            path: ideasRef.path,
            operation: 'list'
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoadingIdeas(false);
      });
      return () => unsubscribe();
    } else if (!loadingAuth) {
      setLoadingIdeas(false);
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  const handleBuildDpr = (idea: GenerateInvestmentIdeaAnalysisOutput) => {
    if (!idea || !user) return;
    localStorage.setItem('dprAnalysis', JSON.stringify(idea));
    router.push(
      `/dpr-report?idea=${encodeURIComponent(
        idea.title
      )}&name=${encodeURIComponent(user?.displayName || '[Promoter Name Here]')}`
    );
  };
  
  if (loadingAuth || loadingIdeas) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center">
        <p>{translations.myIdeas.loginPrompt}</p>
        <Button asChild className="mt-4">
          <Link href="/login">{translations.myIdeas.loginButton}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Lightbulb /> {translations.myIdeas.title}
        </h1>
        <p className="text-muted-foreground">
          {translations.myIdeas.description}
        </p>
      </div>

      {ideas.length === 0 ? (
        <Card className="text-center py-10">
          <CardContent className="p-4 md:p-6 pt-0">
            <p className="text-muted-foreground">
              {translations.myIdeas.noIdeas}
            </p>
            <Button asChild className="mt-4">
              <Link href="/brainstorm">{translations.myIdeas.startBrainstorming}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {ideas.map((idea, index) => (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="h-full flex flex-col">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle>{idea.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {idea.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow" />
                <CardContent className="p-4 md:p-6 pt-0 flex flex-col gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button asChild variant="outline" className="w-full">
                        <Link
                          href={{
                            pathname: '/investment-ideas/custom',
                            query: { idea: idea.title },
                          }}
                        >
                          {translations.myIdeas.viewAnalysis}
                        </Link>
                      </Button>
                       <Button onClick={() => handleBuildDpr(idea)} className="w-full">
                        <ChevronsRight className="mr-2 h-4 w-4"/>
                        Build DPR
                      </Button>
                    </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

    