'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Printer,
  Sparkles,
  Save,
  Check,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import RichTextEditor from '@/components/financify/rich-text-editor';
import { ProjectCostPieChart, FinancialProjectionsBarChart } from '@/components/financify/dpr-charts';
import { generateDprSectionAction } from '@/app/actions';
import { useAuth } from '@/context/auth-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { dprSectionConfig } from '@/lib/dpr-config';

type DprData = {
  [key: string]: any;
};

const formatCurrency = (amount: number, notation: 'compact' | 'standard' = 'standard') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};


function DPRReportContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const [dprData, setDprData] = useState<DprData | null>(null);
  const [activeSection, setActiveSection] = useState<string>('executiveSummary');
  const [isRefining, setIsRefining] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  useEffect(() => {
    const storedDpr = localStorage.getItem('generatedDpr');
    if (storedDpr) {
      try {
        setDprData(JSON.parse(storedDpr));
      } catch (e) {
        toast({ variant: 'destructive', description: 'Corrupted DPR data.' });
        router.push('/my-ideas');
      }
    } else {
      toast({ variant: 'destructive', description: 'No DPR data found.' });
      router.push('/my-ideas');
    }
  }, [router, toast]);
  
  const handleSectionContentChange = (sectionKey: string, newContent: string) => {
    setDprData(prev => prev ? { ...prev, [sectionKey]: newContent } : null);
  };
  
  const handleRefineSection = async () => {
      if (!dprData || !userProfile || !refinementPrompt) return;

      setIsRefining(true);
      
      const ideaAnalysis = JSON.parse(localStorage.getItem('dprAnalysis') || '{}');
      const existingContent = dprData[activeSection];

      try {
          const result = await generateDprSectionAction({
              idea: ideaAnalysis,
              promoterName: userProfile.displayName || "Entrepreneur",
              section: activeSection,
              basePrompt: "Refine the provided content based on the user's instruction.", // Generic prompt for refinement
              existingContent: existingContent,
              refinementPrompt: refinementPrompt
          });

          if (result.success && result.data.content) {
              handleSectionContentChange(activeSection, result.data.content);
              toast({ title: 'Section Refined', description: `The ${dprSectionConfig.find(s=>s.key === activeSection)?.title} section has been updated.` });
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
          ideaTitle: JSON.parse(localStorage.getItem('dprAnalysis') || '{}').title 
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


  if (!dprData) {
    return <div className="flex flex-col justify-center items-center h-full text-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Loading Your DPR...</h2>
    </div>;
  }
  
  const activeSectionData = dprSectionConfig.find(s => s.key === activeSection);
  
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
          <h1 className="text-3xl font-bold mt-2">Detailed Project Report</h1>
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
                        <DialogTitle>Refine "{activeSectionData?.title}" Section</DialogTitle>
                        <DialogDescription>
                            Tell the AI how you'd like to change this section. For example, "Make it more formal," "Add more details about the marketing plan," or "Rewrite this in three bullet points."
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
                {dprSectionConfig.map(section => (
                  <Button
                    key={section.key}
                    variant={activeSection === section.key ? 'secondary' : 'ghost'}
                    onClick={() => setActiveSection(section.key)}
                    className="justify-start"
                  >
                    <section.icon className="mr-3 h-5 w-5" />
                    {section.title}
                  </Button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3 space-y-6">
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <FileText className="text-primary"/>
                    {activeSectionData?.title}
                </CardTitle>
                <CardDescription>{activeSectionData?.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {activeSectionData?.key === 'financialProjections' && typeof dprData.financialProjections === 'object' ? (
                <div className="space-y-8">
                  <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: dprData.financialProjections.summaryText || ''}} />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-semibold mb-2">Project Cost Breakdown</h3>
                      <ProjectCostPieChart data={dprData.financialProjections.costBreakdown || []} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Means of Finance</h3>
                      <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: dprData.financialProjections.meansOfFinance || '' }} />
                    </div>
                  </div>
                  
                  <div>
                      <h3 className="font-semibold mb-4">Yearly Projections (Sales vs. Profit)</h3>
                      <FinancialProjectionsBarChart data={dprData.financialProjections.yearlyProjections || []} />
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <h3 className="font-semibold mb-2">Profitability Analysis</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: dprData.financialProjections.profitabilityAnalysis || '' }} />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Break-Even Analysis</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: dprData.financialProjections.breakEvenAnalysis || '' }} />
                      </div>
                  </div>
                </div>
              ) : (
                <RichTextEditor
                    content={dprData[activeSection] || ''}
                    onChange={(newContent) => handleSectionContentChange(activeSection, newContent)}
                />
              )}
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
        </main>
      </div>

       <div className="a4-container hidden print:block">
            {dprSectionConfig.map(section => (
                <div key={section.key} className="mb-8 break-after-page">
                    <h2 className="text-2xl font-bold border-b-2 border-primary pb-2 mb-4">{section.title}</h2>
                    {section.key === 'financialProjections' ? (
                       <p>See charts and tables in appendix.</p>
                    ) : (
                       <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: dprData[section.key] || '' }} />
                    )}
                </div>
            ))}
       </div>
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