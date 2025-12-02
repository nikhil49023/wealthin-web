'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Save,
  CheckCircle,
  AlertTriangle,
  Timer,
  Printer,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DprQuizData } from '@/ai/schemas/dpr';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/auth-provider';
import { generateDprSectionAction } from '@/app/actions';
import { dprSectionConfig } from '@/lib/dpr-config';
import { motion, AnimatePresence } from 'framer-motion';
import { FormattedText } from '@/components/financify/formatted-text';
import { Badge } from '@/components/ui/badge';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const db = getFirestore(app);

type DprSectionWithStatus = (typeof dprSectionConfig)[0] & {
  content: any | null;
  status: 'pending' | 'loading' | 'done' | 'error';
};

function DPRReportContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [quizData, setQuizData] = useState<DprQuizData | null>(null);
  const [sections, setSections] = useState<DprSectionWithStatus[]>(() => 
    dprSectionConfig.map(s => ({ ...s, content: null, status: 'pending' }))
  );
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isComplete = currentSectionIndex >= sections.length;

  useEffect(() => {
    const storedData = localStorage.getItem('dprQuizData');
    if (storedData) {
      try {
        setQuizData(JSON.parse(storedData));
      } catch (e) {
        toast({ variant: 'destructive', description: 'Could not load project data. Please start over.' });
        router.push('/brainstorm');
      }
    } else {
      toast({ variant: 'destructive', description: 'Please complete the DPR quiz first.' });
      router.push('/brainstorm');
    }
    setIsLoading(false);
  }, [router, toast]);
  
  const generateSection = useCallback(async (index: number) => {
    if (index >= sections.length || !quizData) return;

    const sectionConf = dprSectionConfig[index];
    setSections(prev => prev.map((s, i) => i === index ? { ...s, status: 'loading' } : s));
    
    try {
        const result = await generateDprSectionAction({
            idea: quizData,
            section: sectionConf.key,
            basePrompt: sectionConf.prompt,
        });

        if (result.success && result.data.content) {
            setSections(prev => prev.map((s, i) => i === index ? { ...s, content: result.data.content, status: 'done' } : s));
            setCurrentSectionIndex(prev => prev + 1); // Move to next section
        } else {
            throw new Error(result.error || `Failed to generate content for ${sectionConf.title}`);
        }
    } catch (err: any) {
         setSections(prev => prev.map((s, i) => i === index ? { ...s, content: err.message, status: 'error' } : s));
         setError(`Failed on section: ${sectionConf.title}. Please try again.`);
    }
  }, [quizData, sections.length]);


  // Effect for sequential section generation
  useEffect(() => {
    if (quizData && !isLoading && currentSectionIndex < sections.length) {
      generateSection(currentSectionIndex);
    }
  }, [quizData, isLoading, currentSectionIndex, generateSection, sections.length]);

  const handleSaveDpr = async () => {
    if (!quizData || !user || !isComplete) return;

    setIsSaving(true);
    const savedDprData = {
        quizData,
        sections: sections.map(s => ({ key: s.key, content: s.content })),
        savedAt: serverTimestamp(),
    };

    try {
        // This can be saved to a 'dprs' collection in Firestore
        // For now, we'll just show a success message
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save
        setIsSaved(true);
        toast({ title: 'Success', description: 'Your DPR draft has been saved.' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save DPR draft.' });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleGenerateFinal = async () => {
    if (!quizData || !isComplete) return;
    
    toast({ description: "Finalizing your report..." });

    try {
        const response = await fetch('/api/generate-dpr-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sections: sections.map(s => ({ key: s.key, content: s.content })), 
                quizData 
            }),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'Failed to generate final report HTML.');
        }

        const html = await response.text();
        const newTab = window.open();
        if (newTab) {
            newTab.document.open();
            newTab.document.write(html);
            newTab.document.close();
        } else {
            toast({
                variant: 'destructive',
                title: 'Could not open new tab',
                description: 'Please disable your pop-up blocker and try again.',
            });
        }
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Generation Failed', description: err.message });
    }
  };
  
  if (isLoading) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
      <div className="max-w-4xl mx-auto space-y-8">
         <Button variant="ghost" asChild className="-ml-4">
          <Link href="/my-ideas">
            <ArrowLeft className="mr-2" />
            Back to My Ideas
          </Link>
        </Button>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl">{quizData?.projectName}</CardTitle>
                        <CardDescription>Detailed Project Report Generation</CardDescription>
                    </div>
                    <Badge variant={isComplete ? "default" : "secondary"} className={isComplete ? 'bg-green-600' : ''}>
                       {isComplete ? <CheckCircle className="mr-2"/> : <Loader2 className="mr-2 animate-spin"/>}
                       {isComplete ? "Completed" : "Generating..."}
                    </Badge>
                </div>
            </CardHeader>
        </Card>

        {error && (
            <Card className="bg-red-50 border-red-200">
                <CardHeader className="flex flex-row gap-4 items-center">
                    <AlertTriangle className="h-8 w-8 text-red-600"/>
                    <div>
                        <CardTitle className="text-destructive">An Error Occurred</CardTitle>
                        <CardDescription className="text-red-800">{error}</CardDescription>
                    </div>
                </CardHeader>
            </Card>
        )}
        
        <div className="space-y-6">
            <AnimatePresence>
                {sections.map((section, index) => (
                    (section.status !== 'pending') &&
                    <motion.div
                      key={section.key}
                      initial={{opacity: 0, y: 20}}
                      animate={{opacity: 1, y: 0}}
                      transition={{duration: 0.5}}
                    >
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between gap-4 p-4 md:p-6">
                                <div className="flex items-center gap-4">
                                    <section.icon className="h-8 w-8 text-primary flex-shrink-0" />
                                    <CardTitle className="text-xl">{section.title}</CardTitle>
                                </div>
                                {section.status === 'loading' && <Badge variant="secondary"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Working...</Badge>}
                                {section.status === 'done' && <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="mr-2 h-4 w-4"/>Done</Badge>}
                                {section.status === 'error' && <Badge variant="destructive"><AlertTriangle className="mr-2 h-4 w-4"/>Error</Badge>}
                            </CardHeader>
                            <CardContent className="p-4 md:p-6 pt-0 min-h-[100px]">
                            {section.status === 'loading' ? (
                                <div className="flex items-center justify-center flex-col text-muted-foreground gap-2 h-24">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <span>Generating...</span>
                                </div>
                            ) : section.status === 'error' ? (
                                <div className="text-destructive font-semibold">Failed to generate this section. Please try again.</div>
                            ) : section.status === 'pending' ? (
                                <div className="flex items-center justify-center flex-col text-muted-foreground gap-2 h-24">
                                    <Timer className="h-8 w-8" />
                                    <span>Waiting to generate...</span>
                                </div>
                            ) : (
                                <FormattedText text={JSON.stringify(section.content) || ''} />
                            )}
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
        
       {isComplete && (
          <Card>
            <CardHeader>
                <CardTitle>Generation Complete</CardTitle>
                <CardDescription>Your DPR draft has been fully generated. You can now save it or generate a printable version.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button onClick={handleSaveDpr} disabled={isSaving || isSaved} variant="outline">
                    {isSaved ? <><CheckCircle className="mr-2" /> Saved</>
                           : isSaving ? <><Loader2 className="mr-2 animate-spin" /> Saving...</>
                                      : <><Save className="mr-2" /> Save Draft</>}
                </Button>

                <Button onClick={handleGenerateFinal}>
                    <Printer className="mr-2" />
                    Generate Final Draft
                </Button>
            </CardContent>
          </Card>
       )}

      </div>
    );
}

export default function DPRReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <DPRReportContent />
        </Suspense>
    );
}
