
'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { getFirestore, collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
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
      (error) => {
        console.error("Budget report transactions snapshot error", error);
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


  const generateReportHtml = useCallback(async (reportData: GenerateBudgetReportOutput) => {
    const response = await fetch('/budget-report-template.html');
    let template = await response.text();
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

    template = template.replace(/{{userName}}/g, user?.displayName || 'Valued User');
    template = template.replace(/{{currentDate}}/g, new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
    template = template.replace(/{{totalIncome}}/g, formatCurrency(reportData.overallBreakdown.totalIncome));
    template = template.replace(/{{totalExpenses}}/g, formatCurrency(reportData.overallBreakdown.totalExpenses));
    template = template.replace(/{{savings}}/g, formatCurrency(reportData.overallBreakdown.savings));
    template = template.replace(/{{savingsRate}}/g, String(reportData.overallBreakdown.savingsRate));
    template = template.replace(/{{aiSummary}}/g, reportData.summary);

    const expenseRowsHtml = reportData.expenseBreakdown
        .map(item => `
            <tr>
                <td class="px-6 py-4 font-medium text-gray-700">${item.name}</td>
                <td class="px-6 py-4 num-cell font-bold text-gray-800">${formatCurrency(item.value)}</td>
            </tr>
        `)
        .join('');
    template = template.replace('{{expenseRows}}', expenseRowsHtml);
    
    return template;

  }, [user]);

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
    setError(null);
    
    try {
        const result = await generateBudgetReportAction({ transactions });

        if (!result.success) {
            throw new Error(result.error || 'Failed to generate report.');
        }

        const data = result.data;
        const finalHtml = await generateReportHtml(data);
        
        const reportWindow = window.open();
        if (reportWindow) {
            reportWindow.document.write(finalHtml);
            reportWindow.document.close();
        } else {
            throw new Error("Could not open new tab. Please disable your pop-up blocker.");
        }

        // Award credits for generating a report
        const userDocRef = doc(db, 'users', user.uid);
        const newCredits = (userProfile.credits ?? 0) + BUDGET_REPORT_REWARD;
        await setDoc(userDocRef, { credits: newCredits }, { merge: true });
        toast({
            title: 'Credits Earned!',
            description: `You've earned ${BUDGET_REPORT_REWARD} credits for generating a report. New balance: ${newCredits}`,
        });

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
          <Link href="/dashboard">
            <ArrowLeft className="mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

       <Card className="text-center py-10 md:py-20">
         <CardContent className="space-y-4">
           {isGenerating ? (
             <>
               <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
               <h3 className="text-xl font-semibold">Generating Your Report...</h3>
               <p className="text-muted-foreground">The AI is analyzing your transactions. This might take a moment.</p>
             </>
           ) : transactions.length > 0 ? (
             <>
               <FilePieChart className="h-16 w-16 mx-auto text-muted-foreground mb-4"/>
               <h3 className="text-xl font-semibold">Ready to Analyze Your Budget?</h3>
               <p className="text-muted-foreground mt-2 max-w-md mx-auto">Click the button below to generate a detailed, printable report of your spending habits that will open in a new tab.</p>
                <Button onClick={handleGenerateReport} className="mt-4">
                  Generate & View Report
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
    </div>
  );
}
