
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

function CustomizeDPRContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [analysis, setAnalysis] = useState<GenerateInvestmentIdeaAnalysisOutput | null>(null);
  const [promoterName, setPromoterName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const ideaTitle = searchParams.get('idea');
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
    
    // Use a placeholder if the name is not available, but don't block.
    setPromoterName(user?.displayName || "[Promoter Name Here]");

  }, [searchParams, toast, user]);

  const handleNavigateToReport = async () => {
    if (!analysis) return;
    
    setIsNavigating(true);
    // Navigate to the report page which will use the new template
    router.push(`/dpr-report?idea=${encodeURIComponent(analysis.title)}&name=${encodeURIComponent(promoterName)}`);
  };
  
  if (error) {
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
          <Link href="/my-ideas">
            <ArrowLeft className="mr-2" />
            Back to My Ideas
          </Link>
        </Button>
        <div className="text-center">
            <h1 className="text-3xl font-bold">Generate Your Detailed Project Report</h1>
            <p className="text-muted-foreground mt-2">
            The AI will generate a complete, bank-ready DPR which you can then edit and refine.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
                className="p-6 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center gap-4"
                onClick={handleNavigateToReport}
            >
                <Banknote className="h-12 w-12 text-primary" />
                <h3 className="font-semibold text-lg">Bank Loan Application</h3>
                <p className="text-xs text-muted-foreground">Generate the full report optimized for bank loan applications.</p>
            </Card>
             <Card 
                className="p-6 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center gap-4"
                onClick={handleNavigateToReport}
             >
                <FileText className="h-12 w-12 text-primary" />
                <h3 className="font-semibold text-lg">Legal & General Purpose</h3>
                 <p className="text-xs text-muted-foreground">Generate a comprehensive report for legal and general business planning.</p>
            </Card>
        </div>
        
        {isNavigating && (
             <Card className="text-center py-10">
                <CardContent className="space-y-4">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                    <h3 className="text-xl font-semibold">Preparing Your Report...</h3>
                    <p className="text-muted-foreground">Please wait while we generate the document.</p>
                </CardContent>
            </Card>
        )}
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

    