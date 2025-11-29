
'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ArrowLeft,
  Wand2,
  Check,
  Save,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useAuth } from '@/context/auth-provider';
import { generateDprSectionAction } from '@/app/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import RichTextEditor from '@/components/wealthin/rich-text-editor';

const db = getFirestore(app);

type DprSection = {
  key: string;
  title: string;
  prompt: string;
  content: string | null;
  status: 'pending' | 'loading' | 'done' | 'error';
};

const dprSectionsConfig: Omit<DprSection, 'content' | 'status'>[] = [
  { key: 'executiveSummary', title: 'Executive Summary', prompt: 'Generate an Executive Summary for the business. It must include a "Project at a Glance" HTML table with credible, realistic numbers for all financial fields (Project Cost, Promoter\'s Contribution, Bank Loan, DSCR, Employment).' },
  { key: 'introduction', title: 'Introduction & Background', prompt: 'Describe the company background and provide a detailed profile for each promoter, including their qualifications, experience, and net worth.'},
  { key: 'marketAnalysis', title: 'Market Analysis', prompt: 'Analyze the industry, market size, trends, and the target audience. Detail the demand-supply gap and the proposed marketing strategy.'},
  { key: 'technicalFeasibility', title: 'Technical Feasibility', prompt: 'Detail the manufacturing process in a numbered list. Also provide a "Key Machinery List" HTML table with machine names, fictional suppliers, and realistic costs.' },
  { key: 'financials', title: 'Financials', prompt: 'Generate the complete HTML for the financial section of a DPR. This includes subsections for Cost of Project, Means of Finance, Operating Expenses, Working Capital, Term Loan Repayment, Projected Profitability, Balance Sheet, and Financial Ratios, all with fully populated HTML tables.'},
  { key: 'conclusion', title: 'Conclusion', prompt: 'Write a concluding paragraph summarizing the project\'s viability and formally requesting the bank to sanction the credit facilities.' },
];

function DPREditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [idea, setIdea] = useState<GenerateInvestmentIdeaAnalysisOutput | null>(null);
  const [promoterName, setPromoterName] = useState<string>('');
  const [dprSections, setDprSections] = useState<DprSection[]>(() => 
    dprSectionsConfig.map(s => ({ ...s, content: null, status: 'pending' }))
  );
  
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [activeEditor, setActiveEditor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');


  useEffect(() => {
    const ideaTitle = searchParams.get('idea');
    const name = searchParams.get('name') || user?.displayName || "[Promoter Name Here]";
    const storedAnalysis = localStorage.getItem('dprAnalysis');
    
    if (!ideaTitle || !storedAnalysis) {
        toast({ variant: 'destructive', description: "Missing required information. Please start over." });
        router.push('/brainstorm');
        return;
    }

    try {
        const parsedAnalysis: GenerateInvestmentIdeaAnalysisOutput = JSON.parse(storedAnalysis);
        if (parsedAnalysis.title !== ideaTitle) {
            throw new Error("Mismatched analysis data.");
        }
        setIdea(parsedAnalysis);
        setPromoterName(name);
        generateInitialSections(parsedAnalysis, name);
    } catch (e) {
        toast({ variant: 'destructive', description: 'Could not load business analysis data.' });
        router.push('/brainstorm');
    }
  }, [searchParams, router, toast, user]);

  const generateInitialSections = useCallback(async (currentIdea: GenerateInvestmentIdeaAnalysisOutput, name: string) => {
    setIsGenerating(true);
    for (let i = 0; i < dprSectionsConfig.length; i++) {
        setCurrentSectionIndex(i);
        const section = dprSectionsConfig[i];
        try {
            setDprSections(prev => prev.map(s => s.key === section.key ? { ...s, status: 'loading' } : s));
            const result = await generateDprSectionAction({
                idea: currentIdea,
                promoterName: name,
                section: section.key,
                basePrompt: section.prompt
            });
            if (result.success) {
                setDprSections(prev => prev.map(s => s.key === section.key ? { ...s, content: result.data.content as string, status: 'done' } : s));
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            console.error(`Failed to generate section ${section.key}:`, e);
            setDprSections(prev => prev.map(s => s.key === section.key ? { ...s, content: `<p class="text-destructive">Generation failed: ${e.message}</p><p>Please use the AI Toolkit to try again.</p>`, status: 'error' } : s));
        }
    }
    setIsGenerating(false);
    setIsComplete(true);
  }, []);

  const handleRefineSection = async () => {
    if (!activeEditor || !refinementPrompt || !idea) return;
    
    const sectionToRefine = dprSections.find(s => s.key === activeEditor);
    if (!sectionToRefine) return;

    setIsRefining(true);

    try {
        const result = await generateDprSectionAction({
            idea: idea,
            promoterName: promoterName,
            section: sectionToRefine.key,
            basePrompt: sectionToRefine.prompt,
            existingContent: sectionToRefine.content || '',
            refinementPrompt: refinementPrompt
        });

        if (result.success) {
            setDprSections(prev => prev.map(s => s.key === activeEditor ? {...s, content: result.data.content as string} : s));
            toast({ title: "Section Refined", description: "The AI has updated the content." });
        } else {
            throw new Error(result.error);
        }

    } catch (e: any) {
        toast({ variant: 'destructive', title: "Refinement Failed", description: e.message });
    } finally {
        setIsRefining(false);
        setRefinementPrompt('');
        setActiveEditor(null);
    }
  };
  
   const handleSaveFeedback = async (feedbackText: string) => {
    if (!user || !feedbackText.trim()) return;
    try {
      const feedbackRef = collection(db, 'dpr-feedback');
      await addDoc(feedbackRef, {
        userId: user.uid,
        feedback: feedbackText,
        timestamp: serverTimestamp(),
        page: 'dpr-editor',
        ideaTitle: idea?.title
      });
      toast({ title: 'Feedback Submitted', description: 'Thank you for your valuable input!' });
      setFeedback(''); // Clear feedback form
    } catch (e: any) {
      const permissionError = new FirestorePermissionError({
        path: `dpr-feedback/new-doc`,
        operation: 'create',
        requestResourceData: { feedback: feedbackText }
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not submit feedback.' });
    }
  };

  const progress = isComplete ? 100 : (currentSectionIndex / dprSectionsConfig.length) * 100;

  if (isGenerating && !isComplete) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center py-10">
          <Card className="w-full max-w-lg p-8">
            <CardContent className="pt-6">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="font-semibold mt-4">WealthIn AI is building your DPR...</p>
                <Progress value={progress} className="mt-4" />
                <p className="text-sm text-muted-foreground mt-2">
                  {currentSectionIndex < dprSectionsConfig.length
                    ? `Step ${currentSectionIndex + 1} of ${dprSectionsConfig.length}: Generating "${dprSectionsConfig[currentSectionIndex].title}"`
                    : 'Finalizing...'}
                </p>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href="/my-ideas"><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Ideas</Link>
        </Button>
        <Button onClick={() => window.print()}>
          <FileText className="mr-2 h-4 w-4"/> Print / Save as PDF
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{idea?.title}</CardTitle>
          <CardDescription>
            This is your interactive Detailed Project Report. Click to edit any section, or use the AI Toolkit to refine content.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="space-y-4">
        {dprSections.map((section, index) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="text-lg">{index + 1}. {section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={section.content || ''}
                onChange={(newContent) => {
                  setDprSections(prev =>
                    prev.map(s =>
                      s.key === section.key ? { ...s, content: newContent } : s
                    )
                  );
                }}
              />
               <div className="mt-4 flex justify-end">
                <Dialog onOpenChange={(isOpen) => !isOpen && setActiveEditor(null)}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setActiveEditor(section.key)}>
                            <Wand2 className="mr-2 h-4 w-4" /> AI Toolkit
                        </Button>
                    </DialogTrigger>
                    {activeEditor === section.key && (
                         <DialogContent>
                            <DialogHeader>
                                <DialogTitle>AI Toolkit: {section.title}</DialogTitle>
                                <DialogDescription>Enter a prompt to have the AI rewrite or improve this section.</DialogDescription>
                            </DialogHeader>
                             <div className="grid gap-4 py-4">
                                <Label htmlFor="refinement-prompt">Your Instruction</Label>
                                <Textarea 
                                    id="refinement-prompt"
                                    placeholder={`e.g., "Make this section more formal for a bank loan application." or "Expand on the marketing strategy."`}
                                    value={refinementPrompt}
                                    onChange={(e) => setRefinementPrompt(e.target.value)}
                                />
                             </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="ghost" disabled={isRefining}>Cancel</Button></DialogClose>
                                <Button onClick={handleRefineSection} disabled={isRefining || !refinementPrompt}>
                                    {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4"/>}
                                    Refine with AI
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    )}
                </Dialog>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>
       <div className="text-center py-4">
          <Dialog>
              <DialogTrigger asChild>
                  <Button variant="link">Give Feedback on this DPR</Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Give Feedback</DialogTitle>
                      <DialogDescription>Your feedback helps us improve the AI. What did you think of this generated DPR?</DialogDescription>
                  </DialogHeader>
                   <Textarea 
                       id="feedback-input" 
                       placeholder="e.g., The financial projections were too optimistic..."
                       value={feedback}
                       onChange={(e) => setFeedback(e.target.value)}
                   />
                  <DialogFooter>
                      <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                      <Button onClick={() => handleSaveFeedback(feedback)}>Submit Feedback</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
       </div>
    </div>
  );
}

export default function DPREditorPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <DPREditorContent />
        </Suspense>
    )
}
