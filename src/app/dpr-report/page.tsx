
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft, Wand2, Star, FileText, Check, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/auth-provider';
import RichTextEditor from '@/components/wealthin/rich-text-editor';
import { generateDprAction } from '@/app/actions';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  ProjectCostPieChart,
  FinancialProjectionsBarChart,
} from '@/components/wealthin/dpr-charts';


const db = getFirestore(app);

type DprSectionKey = 'executiveSummary' | 'projectIntroduction' | 'promoterDetails' | 'businessModel' | 'marketAnalysis' | 'locationAndSite' | 'technicalFeasibility' | 'implementationSchedule' | 'financialProjections' | 'swotAnalysis' | 'regulatoryCompliance' | 'riskAssessment' | 'annexures';

type DprSection = {
    key: DprSectionKey;
    title: string;
    basePrompt: string;
    content: string | any;
    status: 'pending' | 'loading' | 'done' | 'error';
};

const DPR_SECTIONS_CONFIG: Omit<DprSection, 'content' | 'status'>[] = [
    { key: 'executiveSummary', title: 'Executive Summary', basePrompt: 'Write a compelling executive summary for the project. Include the business objective, market opportunity, key financial projections (like total project cost and expected revenue), and the core strengths of the project.' },
    { key: 'projectIntroduction', title: 'Project Introduction', basePrompt: 'Provide a detailed introduction to the project. Describe the business, the industry it operates in, and the vision and mission of the company.' },
    { key: 'promoterDetails', title: 'Promoter Details', basePrompt: 'Write a professional profile for the promoter(s) based on the provided name. Highlight their skills, experience, and suitability for leading this project. If no name is provided, create a placeholder profile.' },
    { key: 'businessModel', title: 'Business Model', basePrompt: 'Describe the business model in detail. Explain how the business will create, deliver, and capture value. Include details on revenue streams, cost structure, and key activities.' },
    { key: 'marketAnalysis', title: 'Market Analysis', basePrompt: 'Conduct a thorough market analysis. Detail the market size, growth trends, target audience demographics, and competitive landscape. Identify the key market opportunities.' },
    { key: 'locationAndSite', title: 'Location and Site Details', basePrompt: 'Describe the proposed location for the project. Justify its suitability in terms of access to raw materials, labor, market, and infrastructure.' },
    { key: 'technicalFeasibility', title: 'Technical Feasibility', basePrompt: 'Detail the technical aspects of the project. Describe the technology to be used, the manufacturing process (if any), and the sources for machinery and raw materials.' },
    { key: 'implementationSchedule', title: 'Implementation Schedule', basePrompt: 'Create a realistic, month-by-month implementation schedule for the project, from initial setup to commercial launch. Present it as an HTML list or table.' },
    { key: 'financialProjections', title: 'Financial Projections', basePrompt: `Generate a detailed financial projection as a single JSON object. This is for a bank loan application, so all numbers MUST be credible. The JSON object must contain these exact keys: "summaryText", "projectCost", "meansOfFinance", "costBreakdown", "yearlyProjections", "profitabilityAnalysis", "cashFlowStatement", "loanRepaymentSchedule", and "breakEvenAnalysis". Format text fields as markdown strings and financial data as JSON arrays as specified in the schema. Do not include any extra text or markdown formatting.` },
    { key: 'swotAnalysis', title: 'SWOT Analysis', basePrompt: 'Conduct a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for the business. Provide at least 3 points for each category.' },
    { key: 'regulatoryCompliance', title: 'Regulatory & Legal Compliance', basePrompt: 'List the key licenses, permits, and regulatory requirements needed to start and operate this business in India. Include details on GST registration, Udyam Aadhar, etc.' },
    { key: 'riskAssessment', title: 'Risk Assessment & Mitigation', basePrompt: 'Identify the top 3-5 potential risks for this business (e.g., market risk, operational risk, financial risk) and propose a clear mitigation strategy for each.' },
    { key: 'annexures', title: 'Annexures', basePrompt: 'List the typical documents that would be included as annexures in a DPR, such as promoter ID proofs, quotations for machinery, and land documents.' },
];

function DPRReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  
  const [idea, setIdea] = useState<GenerateInvestmentIdeaAnalysisOutput | null>(null);
  const [promoterName, setPromoterName] = useState<string>('');
  
  const [dprSections, setDprSections] = useState<DprSection[]>(() =>
    DPR_SECTIONS_CONFIG.map(s => ({ ...s, content: s.key === 'financialProjections' ? null : '', status: 'pending' }))
  );
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  const [activeEditor, setActiveEditor] = useState<DprSectionKey | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    const ideaTitle = searchParams.get('idea');
    const name = searchParams.get('name') || "[Promoter Name Here]"; // Use placeholder if name is missing
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
    } catch (e) {
        toast({ variant: 'destructive', description: 'Could not load business analysis data.' });
        router.push('/brainstorm');
    }
  }, [searchParams, router, toast]);

  useEffect(() => {
      if(idea && promoterName && currentSectionIndex < dprSections.length) {
          generateSection(currentSectionIndex);
      } else if (currentSectionIndex >= dprSections.length) {
          setIsGenerating(false);
          setIsComplete(true);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, promoterName, currentSectionIndex]);

  const generateSection = async (index: number) => {
    if (!idea) return;
    
    const section = dprSections[index];
    setDprSections(prev => prev.map((s, i) => i === index ? { ...s, status: 'loading' } : s));
    
    try {
      const result = await generateDprAction({
        idea,
        promoterName,
        section: section.key,
        basePrompt: section.basePrompt,
      });

      if (result.success) {
        setDprSections(prev => prev.map((s, i) => i === index ? { ...s, content: result.data.content, status: 'done' } : s));
        setCurrentSectionIndex(index + 1);
      } else {
        throw new Error(result.error || `Failed to generate ${section.title}`);
      }
    } catch (err: any) {
      setDprSections(prev => prev.map((s, i) => i === index ? { ...s, status: 'error' } : s));
      toast({ variant: 'destructive', title: 'Generation Error', description: err.message });
      setIsGenerating(false);
    }
  };

  const handleContentChange = (key: DprSectionKey, newContent: string | object) => {
    setDprSections(prev => prev.map(s => s.key === key ? { ...s, content: newContent } : s));
  };

  const handleRefineSection = async () => {
      if (!activeEditor || !refinementPrompt || !idea) return;
      setIsRefining(true);

      const section = dprSections.find(s => s.key === activeEditor);
      if (!section) return;

      try {
        const result = await generateDprAction({
            idea,
            promoterName,
            section: section.key,
            basePrompt: section.basePrompt,
            existingContent: section.content,
            refinementPrompt: refinementPrompt,
        });

        if (result.success) {
            handleContentChange(section.key, result.data.content);
            toast({ title: 'Success', description: `Section "${section.title}" has been refined.`});
        } else {
            throw new Error(result.error || 'Failed to refine content.');
        }

      } catch (err: any) {
          toast({ variant: 'destructive', title: 'Refinement Failed', description: err.message });
      } finally {
          setIsRefining(false);
          setRefinementPrompt('');
          setActiveEditor(null);
      }
  };

  const handleSaveFeedback = async (feedback: string) => {
    if (!user || !feedback.trim()) return;

    try {
      const feedbackRef = collection(db, 'dpr-feedback');
      await addDoc(feedbackRef, {
        userId: user.uid,
        feedback: feedback,
        timestamp: serverTimestamp(),
        page: 'dpr-editor',
      });
      toast({ title: 'Feedback Submitted', description: 'Thank you for your valuable input!' });
    } catch (e: any) {
      const permissionError = new FirestorePermissionError({
        path: `dpr-feedback/new-doc`,
        operation: 'create',
        requestResourceData: { feedback }
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not submit feedback.' });
    }
  };

  const progress = isComplete ? 100 : (currentSectionIndex / dprSections.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">DPR Editor</h1>
          <p className="text-muted-foreground">Review, edit, and refine your AI-generated Detailed Project Report.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" asChild>
                <Link href="/my-ideas"><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Ideas</Link>
            </Button>
            <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4"/> Print / Save as PDF
            </Button>
        </div>
      </div>

       {(isGenerating && !isComplete) && (
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="font-semibold">AI is generating your DPR...</p>
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
              {currentSectionIndex < dprSections.length
                ? `Step ${currentSectionIndex + 1} of ${dprSections.length}: Generating "${dprSections[currentSectionIndex].title}"`
                : 'Finalizing...'}
            </p>
          </CardContent>
        </Card>
      )}

      {dprSections.map(section => (
        section.status === 'done' && (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {section.key === 'financialProjections' ? (
                 <div className="space-y-4">
                    {section.content?.summaryText && <FormattedText text={section.content.summaryText} />}
                    <h3 className="font-semibold text-lg pt-4">Project Cost Breakdown</h3>
                    {section.content?.costBreakdown && <ProjectCostPieChart data={section.content.costBreakdown} />}
                    <h3 className="font-semibold text-lg pt-4">Yearly Sales & Profit Projections</h3>
                    {section.content?.yearlyProjections && <FinancialProjectionsBarChart data={section.content.yearlyProjections} />}
                 </div>
              ) : (
                <RichTextEditor
                    content={section.content || ''}
                    onChange={(newContent) => handleContentChange(section.key, newContent)}
                />
              )}
            </CardContent>
            <CardFooter className="justify-end">
                <Dialog onOpenChange={(isOpen) => !isOpen && setActiveEditor(null)}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setActiveEditor(section.key)}>
                            <Wand2 className="mr-2 h-4 w-4"/> AI Toolkit
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Refine "{section.title}"</DialogTitle>
                            <DialogDescription>
                                Tell the AI how you'd like to change this section. Be specific for the best results.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                            <Label htmlFor="refine-prompt">Your Instructions</Label>
                            <Textarea 
                                id="refine-prompt"
                                placeholder="e.g., 'Make this section more formal and add more financial jargon.' or 'Rewrite this to be more optimistic and focus on growth potential.'"
                                value={refinementPrompt}
                                onChange={(e) => setRefinementPrompt(e.target.value)}
                                rows={4}
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                            <Button onClick={handleRefineSection} disabled={isRefining}>
                                {isRefining ? <Loader2 className="mr-2 animate-spin"/> : <Star />}
                                Refine with AI
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardFooter>
          </Card>
        )
      ))}
      {isComplete && (
         <div className="text-center py-4 space-x-4">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="link">Give Feedback on this DPR</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Give Feedback</DialogTitle>
                        <DialogDescription>Your feedback helps us improve the AI. What did you think of this generated DPR?</DialogDescription>
                    </DialogHeader>
                     <Textarea id="feedback-input" placeholder="e.g., The financial projections were too optimistic..."/>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <DialogClose asChild>
                            <Button onClick={() => {
                                const feedback = (document.getElementById('feedback-input') as HTMLTextAreaElement)?.value;
                                handleSaveFeedback(feedback);
                            }}>Submit Feedback</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
         </div>
      )}
    </div>
  );
}

export default function DPRReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <DPRReportContent />
        </Suspense>
    )
}

    