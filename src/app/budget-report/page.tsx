
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, FilePieChart } from 'lucide-react';
import type { GenerateBudgetReportOutput } from '@/ai/schemas/budget-report';
import type { ExtractedTransaction } from '@/ai/schemas/transactions';
import { FormattedText } from '@/components/wealthin/formatted-text';
import { ProjectCostPieChart } from '@/components/wealthin/dpr-charts';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getFirestore, collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { generateBudgetReportAction } from '@/app/actions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';

const db = getFirestore(app);

const BUDGET_REPORT_REWARD = 3;

export default function BudgetReportPage() {
  const { user, userProfile } = useAuth();
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<GenerateBudgetReportOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const transactionsRef = collection(db, 'users', user.uid, 'transactions');
      const unsubscribe = onSnapshot(transactionsRef, (snapshot) => {
          const fetchedTransactions = snapshot.docs.map(doc => doc.data()) as ExtractedTransaction[];
          setTransactions(fetchedTransactions);
          setIsLoading(false);
      },
      (err) => {
        console.error("Budget report transactions snapshot error", err);
        const permissionError = new FirestorePermissionError({
            path: transactionsRef.path,
            operation: 'list'
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else if (!user && !isLoading) {
      router.push('/');
    }
  }, [user, isLoading, router]);


  const handleGenerateReport = async () => {
    if (transactions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot Generate Report',
        description: 'You must have at least one transaction to generate a report.',
      });
      return;
    }
    if (!user || !userProfile) {
      toast({ variant: 'destructive', description: 'Please log in to generate a report.' });
      return;
    }

    setIsGenerating(true);
    setReportData(null);
    setError(null);
    
    try {
        const result = await generateBudgetReportAction({ transactions });

        if (!result.success) {
            throw new Error(result.error || 'Failed to generate report.');
        }
        
        setReportData(result.data);

        // Award credits for generating a report
        if ((userProfile.credits ?? 0) >= 0) { // Check ensures credits logic only runs for valid users
            const userDocRef = doc(db, 'users', user.uid);
            const newCredits = (userProfile.credits ?? 0) + BUDGET_REPORT_REWARD;
            await updateDoc(userDocRef, { credits: newCredits });
            toast({
                title: 'Credits Earned!',
                description: `You've earned ${BUDGET_REPORT_REWARD} credits for generating a report. New balance: ${newCredits}`,
            });
        }

    } catch (e: any) {
        setError(e.message);
        toast({
            variant: 'destructive',
            title: 'Generation Failed',
            description: e.message,
        });
    } finally {
        setIsGenerating(false);
    }
  };

  const chartData = useMemo(() => {
    return reportData?.expenseBreakdown.map(item => ({
      name: item.name,
      value: item.value,
    })) || [];
  }, [reportData]);
  
  if (isLoading) {
      return (
        <div className="flex flex-col justify-center items-center h-full text-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <h2 className="text-xl font-semibold">Loading Transaction Data...</h2>
        </div>
      )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FilePieChart />
            Budget Report
          </h1>
          <p className="text-muted-foreground">
            Generate a detailed analysis of your monthly finances and earn {BUDGET_REPORT_REWARD} credits.
          </p>
        </div>
         <Button variant="ghost" asChild className="-ml-4">
          <Link href="/">
            <ArrowLeft className="mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

       <Card className="text-center py-10 md:py-16">
         <CardContent className="space-y-4">
           {transactions.length > 0 ? (
             <>
               <FilePieChart className="h-16 w-16 mx-auto text-muted-foreground mb-4"/>
               <h3 className="text-xl font-semibold">Ready to Analyze Your Budget?</h3>
               <p className="text-muted-foreground mt-2 max-w-md mx-auto">Click the button below to generate a report of your spending habits using AI.</p>
                <Button onClick={handleGenerateReport} disabled={isGenerating} className="mt-4">
                  {isGenerating ? <><Loader2 className="mr-2 animate-spin"/> Generating...</> : 'Generate Report'}
                </Button>
             </>
           ) : (
             <>
                <h3 className="text-xl font-semibold">No Transaction Data</h3>
                <p className="text-muted-foreground mt-2">Please add some transactions before generating a report.</p>
                <Button asChild className="mt-4"><Link href="/funds">Add Transactions</Link></Button>
             </>
           )}
           {error && !isGenerating && (
                <div className="mt-4 text-destructive">
                    <p>Error: {error}</p>
                </div>
            )}
         </CardContent>
       </Card>

      {isGenerating && (
         <div className="space-y-6">
            <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
             <Card>
                <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                <CardContent><Skeleton className="h-64 w-full" /></CardContent>
            </Card>
         </div>
      )}

      {reportData && (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <FormattedText text={reportData.summary} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Expense Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProjectCostPieChart data={chartData} />
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
