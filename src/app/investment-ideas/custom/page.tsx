
'use client';

import {useEffect, useState, Suspense, useCallback} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowLeft,
  Briefcase,
  Target,
  TrendingUp,
  Shield,
  Save,
  CheckCircle,
  Loader2,
  ChevronsRight,
  Landmark,
  FileText,
} from 'lucide-react';
import {Skeleton} from '@/components/ui/skeleton';
import {Button} from '@/components/ui/button';
import Link from 'next/link';
import {motion, AnimatePresence} from 'framer-motion';
import type {GenerateInvestmentIdeaAnalysisOutput} from '@/ai/schemas/investment-idea-analysis';
import {FormattedText} from '@/components/wealthin/formatted-text';
import {useAuth} from '@/context/auth-provider';
import {useToast} from '@/hooks/use-toast';
import {useLanguage} from '@/hooks/use-language';
import {Badge} from '@/components/ui/badge';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {app} from '@/lib/firebase';
import { generateInvestmentIdeaAnalysisAction, generateIdeaSectionAction } from '@/app/actions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const db = getFirestore(app);

type AnalysisSection = {
  key: keyof Omit<GenerateInvestmentIdeaAnalysisOutput, 'title' | 'summary'>;
  title: string;
  icon: React.ElementType;
  content: string | null;
  status: 'pending' | 'loading' | 'done' | 'error';
};

const sectionConfig: Omit<AnalysisSection, 'content' | 'status'>[] = [
  {
    key: 'investmentStrategy',
    title: 'Investment Strategy',
    icon: Briefcase,
  },
  {
    key: 'targetAudience',
    title: 'Target Audience & Marketing',
    icon: Target,
  },
  {
    key: 'roi',
    title: 'Return on Investment (ROI)',
    icon: TrendingUp,
  },
  {
    key: 'futureProofing',
    title: 'Future-Proofing & Scalability',
    icon: Shield,
  },
  {
    key: 'relevantSchemes',
    title: 'Relevant Government Schemes',
    icon: Landmark,
  },
  {
    key: 'legalRequirements',
    title: 'Legal & Regulatory Requirements',
    icon: FileText,
  },
];

function InvestmentIdeaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idea = searchParams.get('idea');

  const [initialAnalysis, setInitialAnalysis] = useState<{title: string; summary: string} | null>(null);
  const [sections, setSections] = useState<AnalysisSection[]>(() => sectionConfig.map(s => ({ ...s, content: null, status: 'pending' })));
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {user} = useAuth();
  const {toast} = useToast();
  
  const {translations} = useLanguage();

  const handleBuildDpr = () => {
    if (!isSaved) {
      toast({
        variant: 'destructive',
        title: 'Please Save Idea First',
        description: 'You must save the analysis before building a DPR.',
      });
      return;
    }
    if (!initialAnalysis?.title || !user) return;
    
    const fullAnalysis: Partial<GenerateInvestmentIdeaAnalysisOutput> = sections.reduce((acc, section) => {
        if(section.content) {
            (acc as any)[section.key] = section.content;
        }
        return acc;
    }, { title: initialAnalysis.title, summary: initialAnalysis.summary } as Partial<GenerateInvestmentIdeaAnalysisOutput>);

    localStorage.setItem('dprAnalysis', JSON.stringify(fullAnalysis));
    router.push(
      `/customize-dpr?idea=${encodeURIComponent(
        initialAnalysis.title
      )}`
    );
  };

  const saveAnalysis = useCallback(
    async (fullAnalysis: GenerateInvestmentIdeaAnalysisOutput) => {
      if (!user || !fullAnalysis.title) return;
      setIsSaving(true);
      
      const ideasRef = collection(db, 'users', user.uid, 'savedIdeas');
      
      addDoc(ideasRef, {
        ...fullAnalysis,
        savedAt: serverTimestamp(),
      })
      .then(() => {
        setIsSaved(true);
        toast({
          title: translations.investmentIdea._TITLE,
          description: translations.investmentIdea.ideaSavedSuccess,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: ideasRef.path,
            operation: 'create',
            requestResourceData: fullAnalysis
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not save the idea. Please try again.',
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
    },
    [user, toast, translations]
  );
  
  // Effect for initial analysis and sequential section generation
  useEffect(() => {
    if (!idea) {
      setError(translations.investmentIdea.errorNoIdea);
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }

    const generateAnalysis = async () => {
        setError(null);
        
        // 1. Generate Title and Summary
        const initialResult = await generateInvestmentIdeaAnalysisAction({ idea });
        if (!initialResult.success) {
            setError(initialResult.error || 'Failed to generate initial analysis.');
            return;
        }
        setInitialAnalysis({ title: initialResult.data.title, summary: initialResult.data.summary });

        // 2. Generate each section sequentially
        const generatedSections: { [key: string]: string } = {};
        for (let i = 0; i < sectionConfig.length; i++) {
            const sectionConf = sectionConfig[i];
            setSections(prev => prev.map((s, idx) => i === idx ? { ...s, status: 'loading' } : s));

            try {
                const sectionResult = await generateIdeaSectionAction({
                    idea: idea,
                    section: sectionConf.key,
                });

                if (sectionResult.success && sectionResult.data.content) {
                    generatedSections[sectionConf.key] = sectionResult.data.content;
                    setSections(prev => prev.map((s, idx) => i === idx ? { ...s, content: sectionResult.data.content, status: 'done' } : s));
                } else {
                    throw new Error(sectionResult.error || `Failed to generate content for ${sectionConf.title}`);
                }
            } catch (err) {
                setSections(prev => prev.map((s, idx) => i === idx ? { ...s, content: (err as Error).message, status: 'error' } : s));
            }
        }
        
        // 3. Save the complete analysis once all sections are done
        const fullAnalysis: GenerateInvestmentIdeaAnalysisOutput = {
            title: initialResult.data.title,
            summary: initialResult.data.summary,
            ...generatedSections
        } as GenerateInvestmentIdeaAnalysisOutput;
        
        await saveAnalysis(fullAnalysis);
    };

    generateAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, user, router]);


  const allSectionsLoaded = sections.every(s => s.status === 'done');

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive font-semibold">
          {translations.investmentIdea.errorOccurred}
        </p>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex justify-between items-start gap-4">
        <Button variant="ghost" asChild className="-ml-4">
          <Link href="/brainstorm">
            <ArrowLeft className="mr-2" />
            {translations.investmentIdea.backToBrainstorm}
          </Link>
        </Button>

         <div className="flex flex-wrap gap-2 justify-end">
              <Button
                onClick={() => {
                  const fullAnalysis = sections.reduce((acc, section) => ({...acc, [section.key]: section.content}), {title: initialAnalysis?.title, summary: initialAnalysis?.summary}) as any;
                  saveAnalysis(fullAnalysis);
                }}
                disabled={isSaving || isSaved || !user || !allSectionsLoaded}
                variant="outline"
              >
                {isSaved ? (
                  <>
                    <CheckCircle className="mr-2" /> {translations.investmentIdea.ideaSaved}
                  </>
                ) : isSaving ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" /> {translations.investmentIdea.saving}
                  </>
                ) : (
                  <>
                    <Save className="mr-2" /> {translations.investmentIdea.addToMyIdeas}
                  </>
                )}
              </Button>
              <Button onClick={handleBuildDpr} disabled={!allSectionsLoaded || !user || !isSaved}>
                  <ChevronsRight className="mr-2" />
                  Build DPR
              </Button>
            </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-4 md:p-6">
          {!initialAnalysis ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <CardTitle className="text-2xl md:text-3xl">{initialAnalysis.title}</CardTitle>
                <Badge variant="secondary">Powered by WealthIn AI</Badge>
              </div>
              <CardDescription className="text-base pt-2">
                {initialAnalysis.summary}
              </CardDescription>
            </>
          )}
        </CardHeader>
      </Card>

      <div className="space-y-6 md:space-y-8">
        <AnimatePresence>
          {sections.map(
            (section, index) => (
              (section.status !== 'pending' && initialAnalysis) &&
                <motion.div
                  key={section.key}
                  initial={{opacity: 0, y: 20}}
                  animate={{opacity: 1, y: 0}}
                  transition={{duration: 0.5}}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center gap-4 p-4 md:p-6">
                      <section.icon className="h-8 w-8 text-primary flex-shrink-0" />
                      <CardTitle className="text-xl">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0 min-h-[120px]">
                      {section.status === 'loading' ? (
                        <div className="flex items-center justify-center flex-col text-muted-foreground gap-2 h-24">
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <span>Generating...</span>
                        </div>
                      ) : section.status === 'error' ? (
                         <div className="text-destructive font-semibold">Failed to generate this section.</div>
                      ) : (
                        <FormattedText text={section.content || ''} />
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CustomInvestmentIdeaPage() {
  const {translations} = useLanguage();
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <h2 className="text-xl font-semibold">Generating Initial Analysis...</h2>
          <p className="text-muted-foreground">This may take a moment.</p>
        </div>
      }
    >
      <InvestmentIdeaContent />
    </Suspense>
  );
}
