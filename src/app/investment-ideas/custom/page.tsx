
'use client';

import {useEffect, useState, Suspense, useCallback, useRef} from 'react';
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
  Timer,
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
import { Progress } from '@/components/ui/progress';

const db = getFirestore(app);

type AnalysisSection = {
  key: keyof Omit<GenerateInvestmentIdeaAnalysisOutput, 'title' | 'summary'>;
  title: string;
  icon: React.ElementType;
  prompt: string;
  content: string | null;
  status: 'pending' | 'loading' | 'done' | 'error';
};

const sectionConfig: Omit<AnalysisSection, 'content' | 'status'>[] = [
  {
    key: 'investmentStrategy',
    title: 'Investment Strategy',
    icon: Briefcase,
    prompt:
      'Provide a detailed breakdown of the required investment. Include estimated initial capital for equipment, setup, licenses, and initial marketing. Also, estimate the monthly operational costs (working capital). Present the data in a structured way using lists.',
  },
  {
    key: 'targetAudience',
    title: 'Target Audience & Marketing',
    icon: Target,
    prompt:
      'Describe the primary and secondary target audience in detail. Outline a practical, step-by-step marketing and sales strategy to reach these customers.',
  },
  {
    key: 'roi',
    title: 'Return on Investment (ROI)',
    icon: TrendingUp,
    prompt:
      'Give a realistic analysis of the potential Return on Investment. Detail the projected revenue streams, key profitability drivers, and an estimated timeline to break even and achieve profitability.',
  },
  {
    key: 'futureProofing',
    title: 'Future-Proofing & Scalability',
    icon: Shield,
    prompt:
      "Analyze the business's long-term viability. Discuss potential for scalability (e.g., expanding product lines, entering new markets), how to handle competition, and strategies to adapt to future market trends.",
  },
  {
    key: 'relevantSchemes',
    title: 'Relevant Government Schemes',
    icon: Landmark,
    prompt:
      'List 2-3 specific and relevant Indian government schemes that could support this business. For each scheme, clearly explain the benefits (e.g., subsidy amount, loan terms) and the primary eligibility criteria.',
  },
  {
    key: 'legalRequirements',
    title: 'Legal & Regulatory Requirements',
    icon: FileText,
    prompt:
      'Summarize the key legal and regulatory requirements for starting this business in India. Include necessary registrations (like GST, Udyam), important licenses, and permits required to operate legally.',
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

  useEffect(() => {
    const generateInitialAnalysis = async () => {
      if (!idea) {
        setError(translations.investmentIdea.errorNoIdea);
        return;
      }
      if (!user) {
        router.push('/login');
        return;
      }

      setError(null);
      
      try {
        const result = await generateInvestmentIdeaAnalysisAction({ idea });
        
        if (result.success) {
            setInitialAnalysis({ title: result.data.title, summary: result.data.summary });
            // After getting title/summary, kick off parallel generation for all other sections
            generateAllSections(idea);
        } else {
            throw new Error(result.error || 'Failed to generate initial analysis.');
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    const generateAllSections = (idea: string) => {
        setSections(prev => prev.map(s => ({...s, status: 'loading'})));

        const generationPromises = sectionConfig.map(sectionConf => 
            generateIdeaSectionAction({
                idea: idea,
                section: sectionConf.key,
                basePrompt: sectionConf.prompt,
            }).then(result => {
                if (result.success && result.data.content) {
                    setSections(prev => prev.map(s => s.key === sectionConf.key ? { ...s, content: result.data.content, status: 'done' } : s));
                } else {
                    setSections(prev => prev.map(s => s.key === sectionConf.key ? { ...s, status: 'error' } : s));
                }
            })
        );
        
        // After all sections are generated (or failed), save the result
        Promise.allSettled(generationPromises).then(() => {
            // This 'updater' function form of setState ensures we get the most recent state
            setSections(currentSections => {
                // We depend on the initialAnalysis state, so we use an outer scope variable
                // that is set before this runs.
                if (initialAnalysis) {
                    const fullAnalysis: GenerateInvestmentIdeaAnalysisOutput = currentSections.reduce((acc, section) => {
                        if (section.content) {
                            (acc as any)[section.key] = section.content;
                        }
                        return acc;
                    }, { title: initialAnalysis.title, summary: initialAnalysis.summary } as any);

                    if (!isSaved) {
                        saveAnalysis(fullAnalysis);
                    }
                }
                return currentSections;
            });
        });
    };

    generateInitialAnalysis();
  }, [idea, user, router, translations.investmentIdea.errorNoIdea, isSaved, saveAnalysis, initialAnalysis]);

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
            (section) => (
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
      
       {sections.every(s => s.status === 'done' || s.status === 'error') && (
          <Card>
            <CardHeader>
                <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button
                    onClick={() => saveAnalysis(sections.reduce((acc, section) => ({...acc, [section.key]: section.content}), {title: initialAnalysis?.title, summary: initialAnalysis?.summary}) as any)}
                    disabled={isSaving || isSaved || !user}
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

                <Button onClick={handleBuildDpr}>
                    <ChevronsRight className="mr-2" />
                    Build DPR
                </Button>
            </CardContent>
          </Card>
       )}

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
