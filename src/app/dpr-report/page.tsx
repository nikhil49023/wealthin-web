
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft, Wand2, FileText, Check, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/auth-provider';
import { generateDprAction } from '@/app/actions';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const db = getFirestore(app);

function DPRReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  
  const [idea, setIdea] = useState<GenerateInvestmentIdeaAnalysisOutput | null>(null);
  const [promoterName, setPromoterName] = useState<string>('');
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);


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
        generateReport(parsedAnalysis, name);
    } catch (e) {
        toast({ variant: 'destructive', description: 'Could not load business analysis data.' });
        router.push('/brainstorm');
    }
  }, [searchParams, router, toast, user]);

  const generateReport = async (idea: GenerateInvestmentIdeaAnalysisOutput, name: string) => {
    setIsGenerating(true);
    try {
        const response = await fetch('/api/generate-dpr-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea: idea, promoterName: name })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to generate DPR HTML from server.");
        }
        const html = await response.text();
        setReportHtml(html);
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Generation Failed", description: e.message });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };
  
  const handleSaveFeedback = async (feedback: string) => {
    if (!user || !feedback.trim()) return;
    try {
      const feedbackRef = collection(db, 'dpr-feedback');
      await addDoc(feedbackRef, {
        userId: user.uid,
        feedback: feedback,
        timestamp: serverTimestamp(),
        page: 'dpr-report',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your Detailed Project Report</h1>
          <p className="text-muted-foreground">Review, edit, and print your AI-generated DPR.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" asChild>
                <Link href="/my-ideas"><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Ideas</Link>
            </Button>
            <Button onClick={handlePrint} disabled={isGenerating}>
                <Printer className="mr-2 h-4 w-4"/> Print / Save as PDF
            </Button>
        </div>
      </div>
      
       {isGenerating ? (
        <Card>
          <CardContent className="pt-6 text-center space-y-2 h-96 flex flex-col justify-center items-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="font-semibold text-lg">WealthIn AI is building your DPR...</p>
            <p className="text-sm text-muted-foreground">This may take up to a minute. Please wait.</p>
          </CardContent>
        </Card>
      ) : reportHtml && (
        <>
            <Card>
                <CardContent className="p-2 sm:p-4">
                    <iframe
                        ref={iframeRef}
                        srcDoc={reportHtml}
                        className="w-full h-[70vh] border rounded-md"
                        title="DPR Preview"
                    />
                </CardContent>
            </Card>
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
         </>
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
