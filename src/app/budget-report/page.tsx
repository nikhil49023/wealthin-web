
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown, ArrowLeft, FilePieChart } from 'lucide-react';
import type { GenerateBudgetReportOutput } from '@/ai/schemas/budget-report';
import type { ExtractedTransaction } from '@/ai/schemas/transactions';
import { Skeleton } from '@/components/ui/skeleton';
import { FormattedText } from '@/components/financify/formatted-text';
import { ProjectCostPieChart } from '@/components/financify/dpr-charts';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { getFirestore, collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { generateBudgetReportAction } from '@/app/actions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const db = getFirestore(app);

const BUDGET_REPORT_REWARD = 3;

export default function BudgetReportPage() {
  const { user, userProfile } = useAuth();
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [report, setReport] = useState<GenerateBudgetReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
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
      async (error) => {
        console.error("Budget report transactions snapshot error", error);
        const permissionError = new FirestorePermissionError({
            path: transactionsRef.path,
            operation: 'list'
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoading(false);
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGenerating && progress < 90) {
      timer = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);
    }
    return () => clearInterval(timer);
  }, [isGenerating, progress]);

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
    setProgress(5);
    setError(null);
    
    try {
        const result = await generateBudgetReportAction({ transactions });

        if (!result.success) {
            throw new Error(result.error || 'Failed to generate report.');
        }

        const data = result.data;
        setProgress(100);
        setReport(data);

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

  const handleExport = () => {
    window.print();
  };

  const totalExpenses = report?.expenseBreakdown.reduce((acc, item) => acc + item.value, 0) || 0;
  const totalIncome = report?.overallBreakdown.find(item => item.name === 'Total Income')?.value || 0;
  
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
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          body * {
            visibility: hidden;
          }
          #print-section,
          #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-grid-cols-2 {
              grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
      
      <div className="flex justify-between items-start no-print">
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

       <div className="flex gap-2 no-print">
         <Button onClick={handleGenerateReport} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : null}
          {isGenerating ? 'Generating...' : 'Generate Report'}
        </Button>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={!report}
        >
          <FileDown className="mr-2" /> Export to PDF
        </Button>
      </div>

      {error && !isGenerating && (
        <Card className="text-center py-10 bg-destructive/10 border-destructive no-print">
          <CardHeader className="p-4 md:p-6">
            <CardTitle>Error Generating Report</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
         <Card>
            <CardHeader className="p-4 md:p-6">
                <CardTitle>Generating Your Report...</CardTitle>
                <CardDescription>The AI is analyzing your transactions. This might take a moment.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 space-y-4">
                 <Progress value={progress} className="w-full" />
                 <p className="text-center text-sm text-muted-foreground">{Math.round(progress)}% Complete</p>
                 <div className="space-y-2 pt-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <Skeleton className="h-72 w-full" />
                    <Skeleton className="h-72 w-full" />
                 </div>
            </CardContent>
         </Card>
      )}
      
      {!report && !isGenerating && transactions.length > 0 && (
         <Card className="text-center py-10 md:py-20">
             <CardContent className="p-4 md:p-6 pt-0">
                 <FilePieChart className="h-16 w-16 mx-auto text-muted-foreground mb-4"/>
                <h3 className="text-xl font-semibold">Ready to Analyze Your Budget?</h3>
                <p className="text-muted-foreground mt-2">Click "Generate Report" to get a detailed breakdown of your spending.</p>
             </CardContent>
         </Card>
      )}

       {!report && !isGenerating && transactions.length === 0 && (
         <Card className="text-center py-10 md:py-20">
             <CardContent className="p-4 md:p-6 pt-0">
                <h3 className="text-xl font-semibold">No Transaction Data</h3>
                <p className="text-muted-foreground mt-2">Please add some transactions before generating a report.</p>
                <Button asChild className="mt-4"><Link href="/transactions">Add Transactions</Link></Button>
             </CardContent>
         </Card>
      )}

      {report && !isGenerating && (
        <div id="print-section" className="space-y-6">
            <Card>
                <CardHeader className="p-4 md:p-6">
                    <CardTitle>Monthly Financial Report</CardTitle>
                    <CardDescription>
                        An AI-generated analysis of your finances.
                        Total Income: <span className="font-bold text-green-600">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalIncome)}</span>
                        {' '}| Total Expenses: <span className="font-bold text-destructive">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalExpenses)}</span>
                    </CardDescription>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="p-4 md:p-6">
                    <CardTitle>AI-Powered Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                    <FormattedText text={report.summary} />
                </CardContent>
            </Card>
             <div className="space-y-6">
                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle>Overall Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                        {report.overallBreakdown.length > 0 ? (
                            <ProjectCostPieChart data={report.overallBreakdown} />
                        ) : (
                            <p className="text-muted-foreground text-center py-10">No overall data to display.</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle>Expense Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                        {report.expenseBreakdown.length > 0 ? (
                            <ProjectCostPieChart data={report.expenseBreakdown} />
                        ) : (
                            <p className="text-muted-foreground text-center py-10">No expense data to display.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      )}
    </div>
  );
}
