'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  FileText,
  FileDown,
  ArrowLeft,
  Loader2,
  Star,
  Save,
  Wand2,
  Sparkles,
  Edit,
  X,
  ImageIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useAuth } from '@/context/auth-provider';
import {
  ProjectCostPieChart,
  FinancialProjectionsBarChart,
} from '@/components/wealthin/dpr-charts';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import {
  getFirestore,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { FormattedText } from '@/components/wealthin/formatted-text';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { generateDprAction } from '../actions';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import RichTextEditor from '@/components/wealthin/rich-text-editor';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const db = getFirestore(app);


type ReportData = {
  [key: string]: any;
};

const dprChapters = [
  {key: 'executiveSummary', title: 'Executive Summary', prompt: 'Summarize the entire business project, including its mission, product/service, target market, and financial highlights. This should be a concise overview.'},
  {key: 'projectIntroduction', title: 'Project Introduction', prompt: 'Provide a detailed background of the project. Explain the problem it solves, its objectives, and its scope.'},
  {key: 'promoterDetails', title: 'Promoter Details', prompt: 'Describe the background of the promoter(s), including their experience, qualifications, and role in the project. Use the promoter\'s name provided.'},
  {key: 'businessModel', title: 'Business Model', prompt: 'Explain how the business will operate. Detail the revenue streams, value proposition, and key activities.'},
  {key: 'marketAnalysis', title: 'Market Analysis', prompt: 'Analyze the industry, market size, trends, and the target audience. Include an assessment of the competition.'},
  {key: 'locationAndSite', title: 'Location and Site', prompt: 'Describe the proposed location for the business, justifying its suitability in terms of infrastructure, accessibility, and market proximity.'},
  {key: 'technicalFeasibility', title: 'Technical Feasibility', prompt: 'Detail the technology, machinery, and processes required for production or service delivery. Include raw material sourcing.'},
  {key: 'implementationSchedule', title: 'Implementation Schedule', prompt: 'Outline a timeline for key project milestones, from setup to launch and full operation.'},
  {key: 'financialProjections', title: 'Financial Projections', prompt: 'Generate realistic financial projections including project cost, means of finance, cost breakdown, yearly sales and profit, profitability analysis, cash flow, loan repayment, and break-even analysis. This must be a detailed, multi-part JSON object.'},
  {key: 'swotAnalysis', title: 'SWOT Analysis', prompt: 'Conduct a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for the business.'},
  {key: 'regulatoryCompliance', title: 'Regulatory & Legal Compliance', prompt: 'List the licenses, permits, and other legal requirements applicable to the business in India.'},
  {key: 'riskAssessment', title: 'Risk Assessment', prompt: 'Identify potential risks (market, operational, financial) and propose mitigation strategies.'},
  {key: 'annexures', title: 'Annexures', prompt: 'List any supporting documents that would be attached, such as market research data, promoter CVs, or quotations for machinery.'},
];

const FeedbackSection = ({ ideaTitle }: { ideaTitle: string | null }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!user || !ideaTitle || rating === 0) {
      toast({
        variant: 'destructive',
        title: 'Please provide a rating before submitting.',
      });
      return;
    }

    setIsSubmitting(true);
    const feedbackData = {
        userId: user.uid,
        ideaTitle: ideaTitle,
        rating: rating,
        comment: comment,
        submittedAt: serverTimestamp(),
      };

    addDoc(collection(db, 'dpr-feedback'), feedbackData)
      .then(() => {
        toast({
          title: 'Feedback Submitted',
          description: 'Thank you for helping us improve!',
        });
        setIsSubmitted(true);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: '/dpr-feedback',
          operation: 'create',
          requestResourceData: feedbackData
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Submission Failed',
          description: 'Could not submit your feedback. Please try again.',
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  if (isSubmitted) {
    return (
      <Card className="no-print bg-green-50 border-green-200">
        <CardHeader className="text-center">
          <CardTitle>Thank you for your feedback!</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="no-print">
      <CardHeader>
        <CardTitle>Rate this DPR</CardTitle>
        <CardDescription>
          Your feedback helps us improve the AI generation quality.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              className={cn(
                'h-8 w-8 cursor-pointer transition-colors',
                (hoverRating || rating) >= star
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-muted-foreground/50'
              )}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            />
          ))}
        </div>
        <Textarea
          placeholder="Optional: Add any comments or suggestions..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <Button
          onClick={handleSubmitFeedback}
          disabled={isSubmitting || rating === 0}
        >
          {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
          Submit Feedback
        </Button>
      </CardContent>
    </Card>
  );
};


function DPRReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GenerateInvestmentIdeaAnalysisOutput | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeToolkit, setActiveToolkit] = useState<string | null>(null);
  const { user } = useAuth();
  
  const [activeEditor, setActiveEditor] = useState<string | null>(null);

  const [showExportWarning, setShowExportWarning] = useState(false);
  
  const ideaTitle = searchParams.get('idea');
  const promoterName = user?.displayName || 'Entrepreneur';

  useEffect(() => {
    const fetchReport = () => {
      if (!user || !ideaTitle) {
        setError('Could not load report. User or idea is missing.');
        setIsLoading(false);
        if (!user) router.push('/');
        return;
      }
      setIsLoading(true);

      const storedReport = localStorage.getItem('generatedDPR');
      const storedAnalysis = localStorage.getItem('dprAnalysis');
      
      if (storedReport) {
        try {
          setReport(JSON.parse(storedReport));
        } catch (e) {
          setError('Failed to parse the generated report data.');
        }
      } else {
        setError(
          'No generated report data found. Please generate the DPR first.'
        );
      }

       if (storedAnalysis) {
        try {
          setAnalysis(JSON.parse(storedAnalysis));
        } catch (e) {
          setError('Failed to parse the business analysis data.');
        }
      } else {
        setError('No business analysis found. Please analyze an idea first.');
      }
      setIsLoading(false);
    };

    fetchReport();
  }, [user, ideaTitle, router]);

  const handleExport = () => {
    setShowExportWarning(true);
  };

  const proceedWithExport = () => {
    setShowExportWarning(false);
    window.print();
  };

  const handleSaveChanges = () => {
    localStorage.setItem('generatedDPR', JSON.stringify(report));
    toast({ title: "Saved", description: "Your changes have been saved to this browser."});
    setActiveEditor(null);
  };

  const handleToolkitAction = async (chapterKey: string, isRefinement: boolean) => {
    if (!analysis || !promoterName || !report) return;

    setIsGenerating(true);
    setActiveToolkit(null);
    
    const chapter = dprChapters.find(c => c.key === chapterKey);
    if (!chapter) return;
    
    const existingContent = report[chapter.key];

    try {
        const result = await generateDprAction({
            idea: analysis,
            promoterName: promoterName,
            section: chapter.key,
            basePrompt: chapter.prompt,
            existingContent: isRefinement ? existingContent : undefined,
            refinementPrompt: isRefinement ? refinementPrompt : undefined,
        });

        if (result.success) {
            let content = result.data.content;
            // If we are refining the financials, remove the isMock flag
            if (isRefinement && chapter.key === 'financialProjections' && typeof content === 'object' && content !== null) {
                content.isMock = false;
            }
            setReport(prev => prev ? ({...prev, [chapter.key]: content}) : null);
            toast({ title: 'Success', description: `Content for "${chapter.title}" has been ${isRefinement ? 'refined' : 'generated'}.` });
        } else {
            throw new Error(result.error || `Failed to generate ${chapter.title}`);
        }

    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: `Error Generating ${chapter.title}`,
            description: e.message
        });
    } finally {
        setIsGenerating(false);
        setRefinementPrompt('');
    }
  }
  
  const handleTextChange = (chapterKey: string, value: string) => {
    setReport(prev => prev ? ({...prev, [chapterKey]: value}) : null);
  }

  const Section = ({
    chapter,
  }: {
    chapter: (typeof dprChapters)[0];
  }) => {
    const content = report ? report[chapter.key] : null;
    const isFinancials = chapter.key === 'financialProjections';
    const isEditing = activeEditor === chapter.key;

    const renderEditableContent = () => {
      if (isLoading || !report) {
        return <div className="space-y-2"><Skeleton className="h-40 w-full" /></div>;
      }
      return (
        <RichTextEditor
            content={content || ''}
            onChange={(newContent) => handleTextChange(chapter.key, newContent)}
            editable={!isGenerating}
        />
      );
    }

    const renderStaticContent = () => {
      if (isLoading || !report) {
        return <div className="space-y-2"><Skeleton className="h-40 w-full" /></div>;
      }
      return <FormattedText text={content || 'Not generated yet.'} />;
    };
    
    const renderFinancials = () => {
        if (typeof content !== 'object' || content === null) {
            return <p>Financial projection data is invalid or missing.</p>;
        }
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Financial Summary</h3>
                    <FormattedText text={content.summaryText} />
                </div>
                <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6 print:grid-cols-2">
                    <div className="space-y-4 print-no-break">
                        <h3 className="text-lg font-semibold">Project Cost Breakdown</h3>
                        <ProjectCostPieChart data={content.costBreakdown} />
                    </div>
                    <div className="space-y-4 print-no-break">
                        <h3 className="text-lg font-semibold">Yearly Projections</h3>
                        <FinancialProjectionsBarChart data={content.yearlyProjections} />
                    </div>
                </div>
            </div>
        );
    };

    return (
      <div className="space-y-4">
        <CardHeader className="p-0 mb-4 border-b pb-4 flex flex-row justify-between items-start">
          <div>
            <CardTitle className="text-2xl md:text-3xl">{chapter.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2 no-print">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Wand2 className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                     {!isFinancials && (
                        <DropdownMenuItem onClick={() => setActiveEditor(chapter.key)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit Manually</span>
                        </DropdownMenuItem>
                     )}
                    <DropdownMenuItem onClick={() => setActiveToolkit(chapter.key)}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        <span>Use AI</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={activeToolkit === chapter.key} onOpenChange={(isOpen) => setActiveToolkit(isOpen ? chapter.key : null)}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>AI Toolkit: {chapter.title}</DialogTitle>
                      <DialogDescription>
                      Use the AI to generate or refine the content for this section.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                      <div className="space-y-2">
                          <Button onClick={() => handleToolkitAction(chapter.key, false)} className="w-full" disabled={isGenerating}>
                              {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <Sparkles className="mr-2" />}
                              Re-generate Section
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">Replaces the current content with a new version from scratch.</p>
                      </div>
                      
                      <div className="space-y-4">
                          <Label htmlFor="refinement-prompt">Refine with AI</Label>
                          <Textarea 
                              id="refinement-prompt"
                              value={refinementPrompt}
                              onChange={(e) => setRefinementPrompt(e.target.value)}
                              placeholder={isFinancials ? "e.g., 'Increase first year sales by 20%', 'Assume a higher initial investment for marketing...'" : "e.g., 'Make this more formal', 'Add more financial details'"}
                          />
                          <Button onClick={() => handleToolkitAction(chapter.key, true)} disabled={!refinementPrompt || !content || isGenerating} className="w-full">
                            {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : null}
                              Refine
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">Refines the existing text based on your prompt.</p>
                      </div>
                  </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
            {isFinancials ? renderFinancials() : (isEditing ? renderEditableContent() : renderStaticContent())}
            {isEditing && (
              <div className="flex flex-col gap-2 mt-4 no-print">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setActiveEditor(null)}>Cancel</Button>
                    <Button onClick={handleSaveChanges}>Save Changes</Button>
                  </div>
              </div>
            )}
        </CardContent>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 @container bg-background py-8">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1in;
            @top-center { content: 'Detailed Project Report: ${ideaTitle || ''}'; font-size: 10pt; color: #666; }
            @bottom-center { content: 'Page ' counter(page); font-size: 10pt; color: #666; }
          }
          html, body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          .tiptap p, .tiptap h1, .tiptap h2, .tiptap h3, .tiptap ul, .tiptap li, .tiptap img { visibility: visible; }
          #print-section { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-break-before { break-before: always; }
          .print-no-break { break-inside: avoid; }
          .print-cover-page { height: 80vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; break-after: always; }
          .tiptap { all: unset; }
          .ProseMirror { box-shadow: none; border: none; padding: 0; }
        }
      `}</style>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start no-print container mx-auto max-w-[210mm] px-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><FileText /> Detailed Project Report</h1>
          <p className="text-muted-foreground max-w-2xl truncate">Final compiled report for: <span className="font-semibold">{ideaTitle}</span></p>
        </div>
        <Button variant="ghost" asChild className="-ml-4 mt-2 sm:mt-0"><Link href="/brainstorm"><ArrowLeft className="mr-2" /> Back to Brainstorm</Link></Button>
      </div>

      <div className="flex gap-2 no-print container mx-auto max-w-[210mm] px-4">
        <Button variant="outline" onClick={handleExport} disabled={isLoading || !!error}><FileDown className="mr-2" /> Export to PDF</Button>
      </div>

       <AlertDialog open={showExportWarning} onOpenChange={setShowExportWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Important Disclaimer</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                  {report?.financialProjections?.isMock && (
                      <p className="font-semibold text-destructive">
                          Warning: The financial projections in this report are based on mock data. Please use the AI toolkit to refine this section with your own data for an accurate report.
                      </p>
                  )}
                  <p>
                      This is an AI-generated DPR. Before submitting to the bank, please cross-check with an eligible agency. A Detailed Project Report (DPR) can be prepared by the Special Purpose Vehicle (SPV) or any qualified agency as decided by the State Government. Agencies empanelled in any scheme of the Ministry of MSME are also eligible to prepare the DPR under this scheme.
                  </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithExport}>
              Continue to Export
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && !isLoading && (
        <Card className="text-center py-10 bg-destructive/10 border-destructive no-print container mx-auto max-w-[210mm]">
          <CardHeader><CardTitle>Error Loading Report</CardTitle></CardHeader>
          <CardContent><p className="text-destructive">{error}</p><Button asChild className="mt-4"><Link href="/brainstorm">Start Over</Link></Button></CardContent>
        </Card>
      )}

      {/* Report Content */}
      <div id="print-section">
        <div className="bg-card shadow-lg mx-auto w-[210mm] min-h-[297mm]">
          {/* Cover Page for Print */}
          <div className="print-cover-page hidden print:flex">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold">Detailed Project Report</h1>
                <h2 className="text-2xl text-muted-foreground">{analysis?.title}</h2>
                <p className="pt-12">Prepared for Banking & Financial Review</p>
                <p>By {promoterName}</p>
            </div>
          </div>
          
          {dprChapters.map((chapter, index) => (
            <div key={chapter.key} className={cn("px-8 md:px-12 py-8", index > 0 && "print-break-before")}>
              <Section chapter={chapter} />
            </div>
          ))}
        </div>
      </div>
      
      {report && !isLoading && (
        <div className="container mx-auto max-w-[210mm] px-4 py-8">
            <FeedbackSection ideaTitle={ideaTitle} />
        </div>
      )}
    </div>
  );
}

export default function DPRReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center h-full text-center no-print">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <h2 className="text-xl font-semibold">Loading Final Report...</h2>
          <p className="text-muted-foreground">Please wait a moment.</p>
        </div>
      }
    >
      <DPRReportContent />
    </Suspense>
  );
}
