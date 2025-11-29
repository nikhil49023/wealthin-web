
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Banknote,
  Loader2,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/auth-provider';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const db = getFirestore(app);

const DPR_GENERATION_COST = 4;

function CustomizeDPRContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  
  const [analysis, setAnalysis] = useState<GenerateInvestmentIdeaAnalysisOutput | null>(null);
  const [promoterName, setPromoterName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCreditAlert, setShowCreditAlert] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const ideaTitle = searchParams.get('idea');
    const name = searchParams.get('name');
    const storedAnalysis = localStorage.getItem('dprAnalysis');

    if (storedAnalysis) {
      try {
        const parsed = JSON.parse(storedAnalysis);
        if (parsed.title === ideaTitle) {
          setAnalysis(parsed);
        } else {
             throw new Error("Analysis data mismatch.");
        }
      } catch (e) {
        setError('Failed to load business analysis data. Please start over.');
        toast({ variant: 'destructive', description: 'Corrupted analysis data.' });
      }
    } else {
      setError('No business analysis found. Please analyze an idea first.');
      toast({ variant: 'destructive', description: 'No analysis data found.' });
    }
    
    if (name) {
      setPromoterName(name);
    } else if (user?.displayName) {
      setPromoterName(user.displayName);
    } else {
      setError('Could not identify promoter name.');
    }
  }, [searchParams, toast, user]);

  const handleGenerateReport = async () => {
    if (!user || !userProfile || !analysis) return;

    if ((userProfile.credits ?? 0) < DPR_GENERATION_COST) {
        setShowCreditAlert(true);
        return;
    }
    
    setIsGenerating(true);

    // 1. Deduct credits first
    const userDocRef = doc(db, 'users', user.uid);
    const newCredits = (userProfile.credits ?? 0) - DPR_GENERATION_COST;

    try {
        await setDoc(userDocRef, { credits: newCredits }, { merge: true });
        toast({
            title: 'Credits Deducted',
            description: `DPR generation started. ${DPR_GENERATION_COST} credits deducted.`
        });
    } catch (e) {
        console.error("Failed to deduct credits:", e);
        const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: { credits: newCredits }
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not deduct credits.' });
        setIsGenerating(false);
        return;
    }
    
    // 2. Call the new API to generate the HTML
    try {
        const response = await fetch('/api/generate-dpr-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea: analysis, promoterName })
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || "Failed to generate the report from the server.");
        }

        const reportHtml = await response.text();
        const blob = new Blob([reportHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Open the generated HTML in a new tab
        window.open(url, '_blank');
        
    } catch (err: any) {
        setError(err.message);
        toast({ variant: 'destructive', title: 'Generation Failed', description: err.message });
         // Refund credits if generation fails after deduction
        await setDoc(userDocRef, { credits: userProfile.credits }, { merge: true });
        toast({ title: 'Credits Refunded', description: 'Your credits have been returned due to a generation error.' });
    } finally {
        setIsGenerating(false);
    }
  };
  
  if (error && !isGenerating) {
      return (
          <div className="text-center py-10">
              <p className="text-destructive font-semibold">An error occurred</p>
              <p className="text-muted-foreground mt-2">{error}</p>
              <Button variant="outline" asChild className="mt-4">
                  <Link href="/brainstorm">Back to Brainstorm</Link>
              </Button>
          </div>
      );
  }

  if (!analysis) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }


  return (
      <div className="max-w-2xl mx-auto space-y-8">
         <Button variant="ghost" asChild className="-ml-4">
          <Link href="/brainstorm">
            <ArrowLeft className="mr-2" />
            Back to Brainstorm
          </Link>
        </Button>
        <div className="text-center">
            <h1 className="text-3xl font-bold">Generate Your Detailed Project Report</h1>
            <p className="text-muted-foreground mt-2">
            The AI will generate a complete, formatted DPR based on your business idea. This action costs {DPR_GENERATION_COST} credits.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
                className="p-6 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center gap-4"
                onClick={handleGenerateReport}
            >
                <Banknote className="h-12 w-12 text-primary" />
                <h3 className="font-semibold text-lg">Bank Loan Application</h3>
                <p className="text-xs text-muted-foreground">Generate the full report optimized for bank loan applications.</p>
            </Card>
             <Card 
                className="p-6 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center gap-4"
                onClick={handleGenerateReport}
             >
                <FileText className="h-12 w-12 text-primary" />
                <h3 className="font-semibold text-lg">Legal & General Purpose</h3>
                 <p className="text-xs text-muted-foreground">Generate a comprehensive report for legal and general business planning.</p>
            </Card>
        </div>
        
        {isGenerating && (
             <Card className="text-center py-10">
                <CardContent className="space-y-4">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                    <h3 className="text-xl font-semibold">Generating Your DPR...</h3>
                    <p className="text-muted-foreground">The AI is building your report. This might take up to a minute.<br/>A new tab will open when it's ready.</p>
                </CardContent>
            </Card>
        )}

        <AlertDialog open={showCreditAlert} onOpenChange={setShowCreditAlert}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Insufficient Credits</AlertDialogTitle>
                    <AlertDialogDescription>
                        You do not have enough credits to generate a DPR. This action costs {DPR_GENERATION_COST} credits.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setShowCreditAlert(false)}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    );
}

export default function CustomizeDPRPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <CustomizeDPRContent />
        </Suspense>
    )
}
