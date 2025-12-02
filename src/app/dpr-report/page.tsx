'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Printer,
  Sparkles,
  Save,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Check,
  Timer,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import RichTextEditor from '@/components/financify/rich-text-editor';
import { ProjectCostPieChart, FinancialProjectionsBarChart } from '@/components/financify/dpr-charts';
import { generateDprSectionAction } from '@/app/actions';
import { useAuth } from '@/context/auth-provider';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { dprSectionConfig } from '@/lib/dpr-config';
import type { DprQuizData } from '@/ai/schemas/dpr';
import { motion, AnimatePresence } from 'framer-motion';

type DprData = { [key: string]: any };

type DprSection = {
  key: string;
  title: string;
  icon: React.ElementType;
  description: string;
  prompt: string;
  content: any | null; // Can be string (HTML) or object (for financials)
  status: 'pending' | 'loading' | 'done' | 'error';
};

const COOLDOWN_SECONDS = 3;

function DPRReportContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const [quizData, setQuizData] = useState<DprQuizData | null>(null);
  const [sections, setSections] = useState<DprSection[]>(() => 
    dprSectionConfig.map(s => ({ ...s, content: null, status: 'pending' }))
  );
  const [activeSectionKey, setActiveSectionKey] = useState<string>(dprSectionConfig[0].key);
  const [generatingSectionIndex, setGeneratingSectionIndex] = useState(-1);
  const [visibleSectionIndex, setVisibleSectionIndex] = useState(-1);

  const [isRefining, setIsRefining] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load quiz data and start generation on mount
  useEffect(() => {
    const storedQuizData = localStorage.getItem('dprQuizData');
    if (storedQuizData) {
      try {
        setQuizData(JSON.parse(storedQuizData));
        setGeneratingSectionIndex(0); // Start generating the first section
        setVisibleSectionIndex(0);
      } catch (e) {
        toast({ variant: 'destructive', description: 'Corrupted quiz data.' });
        router.push('/dpr-editor');
      }
    } else {
      toast({ variant: 'destructive', description: 'No quiz data found.' });
      router.push('/dpr-editor');
    }
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
        } else {
            throw new Error(result.error || `Failed to generate content for ${sectionConf.title}`);
        }
    } catch (err: any) {
         setSections(prev => prev.map((s, i) => i === index ? { ...s, content: err.message, status: 'error' } : s));
    }
  }, [quizData, sections.length]);

  // Effect for sequential section generation
  useEffect(() => {
    if (quizData && generatingSectionIndex >= 0 && generatingSectionIndex < sections.length) {
      const currentStatus = sections[generatingSectionIndex].status;
      if (currentStatus === 'pending') {
          generateSection(generatingSectionIndex);
      }
    }
  }, [quizData, generatingSectionIndex, generateSection, sections]);
  
  // Effect to handle cooldown and next section generation
  useEffect(() => {
    const currentSection = sections[visibleSectionIndex];
    if (currentSection?.status === 'done' || currentSection?.status === 'error') {
      // Current section is done, start cooldown
      setCooldown(COOLDOWN_SECONDS);

      // And immediately start generating the NEXT section in the background
      if (generatingSectionIndex < sections.length - 1) {
          setGeneratingSectionIndex(prev => prev + 1);
      }
    }
  }, [sections, visibleSectionIndex, generatingSectionIndex]);
  
  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    } else {
        // When cooldown finishes, automatically show the next generated section if it's ready
        if (visibleSectionIndex < generatingSectionIndex && (sections[visibleSectionIndex + 1]?.status === 'done' || sections[visibleSectionIndex + 1]?.status === 'error')) {
            setVisibleSectionIndex(prev => prev + 1);
        }
    }
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [cooldown, visibleSectionIndex, generatingSectionIndex, sections]);


  const handleSectionContentChange = (sectionKey: string, newContent: any) => {
    setSections(prev => prev.map(s => s.key === sectionKey ? { ...s, content: newContent } : s));
  };
  
  const handleRefineSection = async () => {
      if (!quizData || !userProfile || !refinementPrompt) return;

      setIsRefining(true);
      
      const currentSection = sections.find(s => s.key === activeSectionKey);
      if (!currentSection) return;

      const existingContent = currentSection.content;
      
      try {
          const result = await generateDprSectionAction({
              idea: quizData,
              section: activeSectionKey,
              basePrompt: `${currentSection.prompt}\n\nRefinement Instruction: ${refinementPrompt}`,
              existingContent: JSON.stringify(existingContent),
          });

          if (result.success && result.data.content) {
              handleSectionContentChange(activeSectionKey, result.data.content);
              toast({ title: 'Section Refined', description: `The ${currentSection.title} section has been updated.` });
          } else {
              throw new Error(result.error || 'Failed to refine section.');
          }
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Refinement Failed', description: e.message });
      } finally {
          setIsRefining(false);
          setShowRefineDialog(false);
          setRefinementPrompt('');
      }
  };

  const handleFeedback = async (feedback: 'good' | 'bad') => {
    setIsSavingFeedback(true);
    try {
      await fetch('/api/save-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          feedback, 
          page: 'DPR Report', 
          ideaTitle: quizData?.projectName || 'Unknown'
        }),
      });
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for helping us improve!',
      });
    } catch (error) {
      console.error('Failed to save feedback', error);
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const renderSectionContent = (section: DprSection) => {
      if (section.status === 'loading') {
        return (
          <div className="flex items-center justify-center flex-col text-muted-foreground gap-2 h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>Generating...</span>
          </div>
        );
      }
      if (section.status === 'error') {
        return <div className="text-destructive font-semibold p-4">Failed to generate this section. Please try refining or editing manually.</div>;
      }
      if (section.status === 'pending') {
        return (
          <div className="flex items-center justify-center flex-col text-muted-foreground gap-2 h-48">
            <Timer className="h-8 w-8" />
            <span>Waiting to generate...</span>
          </div>
        );
      }
      
      if (section.key === 'financialProjections' && typeof section.content === 'object' && section.content !== null) {
        const financialData = section.content;
        return (
          <div className="space-y-8">
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: financialData.summaryText || ''}} />
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-2">Project Cost Breakdown</h3>
                <ProjectCostPieChart data={financialData.costBreakdown || []} />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Means of Finance</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: financialData.meansOfFinance || '' }} />
              </div>
            </div>
            <div>
                <h3 className="font-semibold mb-4">Yearly Projections (Sales vs. Profit)</h3>
                <FinancialProjectionsBarChart data={financialData.yearlyProjections || []} />
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-2">Profitability Analysis</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: financialData.profitabilityAnalysis || '' }} />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Break-Even Analysis</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: financialData.breakEvenAnalysis || '' }} />
                </div>
            </div>
          </div>
        );
      }
      
      return (
        <RichTextEditor
          content={typeof section.content === 'string' ? section.content : ''}
          onChange={(newContent) => handleSectionContentChange(section.key, newContent)}
        />
      );
  };
  
  if (!quizData) {
    return <div className="flex flex-col justify-center items-center h-full text-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Loading Your Project Data...</h2>
    </div>;
  }
  
  const activeSectionData = sections.find(s => s.key === activeSectionKey);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Button variant="ghost" asChild className="-ml-4">
            <Link href="/my-ideas">
              <ArrowLeft className="mr-2" />
              Back to My Ideas
            </Link>
          </Button>
          <h1 className="text-3xl font-bold mt-2">DPR: {quizData.projectName}</h1>
          <p className="text-muted-foreground">Review, edit, and finalize your AI-generated report.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2" /> Print / Save PDF
            </Button>
            <Dialog open={showRefineDialog} onOpenChange={setShowRefineDialog}>
              <DialogTrigger asChild>
                  <Button>
                      <Sparkles className="mr-2"/> AI Toolkit
                  </Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Refine "{sections.find(s => s.key === activeSectionKey)?.title}" Section</DialogTitle>
                      <DialogDescription>
                          Tell the AI how you'd like to change this section. For example, "Make it more formal," or "Rewrite this in three bullet points."
                      </DialogDescription>
                  </DialogHeader>
                  <Textarea 
                      placeholder="Your instructions here..."
                      value={refinementPrompt}
                      onChange={(e) => setRefinementPrompt(e.target.value)}
                      rows={4}
                  />
                  <DialogFooter>
                      <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                      <Button onClick={handleRefineSection} disabled={isRefining || !refinementPrompt}>
                          {isRefining ? <Loader2 className="mr-2 animate-spin"/> : <Sparkles className="mr-2"/>}
                          Refine with AI
                      </Button>
                  </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>DPR Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="flex flex-col gap-1">
                {sections.map((section, index) => (
                  <Button
                    key={section.key}
                    variant={activeSectionKey === section.key ? 'secondary' : 'ghost'}
                    onClick={() => setActiveSectionKey(section.key)}
                    className="justify-start"
                    disabled={index > visibleSectionIndex}
                  >
                    {section.status === 'loading' ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <section.icon className="mr-3 h-5 w-5" />}
                    {section.title}
                  </Button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSectionKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        {activeSectionData?.icon && <activeSectionData.icon className="text-primary"/>}
                        {activeSectionData?.title}
                    </CardTitle>
                    <CardDescription>{activeSectionData?.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeSectionData && renderSectionContent(activeSectionData)}
                </CardContent>
                 <CardContent className="border-t pt-4">
                     <div className="flex items-center justify-end gap-4">
                         <p className="text-sm text-muted-foreground">Was this section helpful?</p>
                         <Button variant="outline" size="icon" onClick={() => handleFeedback('good')} disabled={isSavingFeedback}>
                             <ThumbsUp className="h-4 w-4" />
                         </Button>
                          <Button variant="outline" size="icon" onClick={() => handleFeedback('bad')} disabled={isSavingFeedback}>
                             <ThumbsDown className="h-4 w-4" />
                         </Button>
                     </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

       <div className="a4-container hidden print:block">
            {sections.map(section => (
                <div key={section.key} className="mb-8 break-after-page">
                    <h2 className="text-2xl font-bold border-b-2 border-primary pb-2 mb-4">{section.title}</h2>
                     {section.key === 'financialProjections' && typeof section.content === 'object' ? (
                       <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: section.content?.summaryText || 'Financial summary not available.' }} />
                    ) : (
                       <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: section.content || '' }} />
                    )}
                </div>
            ))}
       </div>
    </div>
  );
}

export default function DPRReportPageWithSuspense() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <DPRReportContent />
    </Suspense>
  );
}
