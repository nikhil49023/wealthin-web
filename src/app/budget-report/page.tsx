
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
import { Loader2, ArrowLeft, FilePieChart, Printer } from 'lucide-react';
import type { ExtractedTransaction } from '@/ai/schemas/transactions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const db = getFirestore(app);

// Simplified types for this component
type Budget = { id: string; name: string; amount: number };
type SavingsGoal = { id: string; name: string; targetAmount: number };

export default function BudgetReportPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const iframeRef = useState<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (user) {
      const unsubscribes: (() => void)[] = [];
      setIsLoading(true);

      const tRef = collection(db, 'users', user.uid, 'transactions');
      unsubscribes.push(onSnapshot(tRef, (snapshot) => {
          setTransactions(snapshot.docs.map(doc => doc.data()) as ExtractedTransaction[]);
      }, (err) => {
        console.error("Transactions snapshot error:", err);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: tRef.path, operation: 'list' }));
      }));

      const bRef = collection(db, 'users', user.uid, 'budgets');
      unsubscribes.push(onSnapshot(bRef, (snapshot) => {
          setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Budget[]);
      }, (err) => {
        console.error("Budgets snapshot error:", err);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: bRef.path, operation: 'list' }));
      }));
      
      const gRef = collection(db, 'users', user.uid, 'savingsGoals');
      unsubscribes.push(onSnapshot(gRef, (snapshot) => {
          setSavingsGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavingsGoal[]);
      }, (err) => {
        console.error("Savings goals snapshot error:", err);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: gRef.path, operation: 'list' }));
      }));

      // Combined loading state
      Promise.all([
          new Promise(res => onSnapshot(tRef, res)),
          new Promise(res => onSnapshot(bRef, res)),
          new Promise(res => onSnapshot(gRef, res)),
      ]).then(() => setIsLoading(false)).catch(() => setIsLoading(false));

      return () => unsubscribes.forEach(unsub => unsub());
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
    if (!user) {
      toast({ variant: 'destructive', description: 'Please log in to generate a report.' });
      return;
    }

    setIsGenerating(true);
    setReportHtml(null);
    setError(null);
    
    try {
        const response = await fetch('/api/budget-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions, budgets, savingsGoals })
        });
        
        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'Failed to generate report from server.');
        }

        const html = await response.text();
        setReportHtml(html);

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

  const handlePrint = () => {
    const iframe = iframeRef[0];
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };
  
  if (isLoading) {
      return (
        <div className="flex flex-col justify-center items-center h-full text-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <h2 className="text-xl font-semibold">Loading Financial Data...</h2>
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
            Generate a detailed analysis of your monthly finances.
          </p>
        </div>
         <Button variant="ghost" asChild className="-ml-4">
          <Link href="/">
            <ArrowLeft className="mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      
      {!reportHtml && (
        <Card className="text-center py-10 md:py-16">
         <CardContent className="space-y-4">
           {transactions.length > 0 ? (
             <>
               <FilePieChart className="h-16 w-16 mx-auto text-muted-foreground mb-4"/>
               <h3 className="text-xl font-semibold">Ready to Analyze Your Budget?</h3>
               <p className="text-muted-foreground mt-2 max-w-md mx-auto">Click the button below to generate a professional report of your spending habits using AI.</p>
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
           {isGenerating && (
                <div className="mt-6 flex justify-center items-center flex-col gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin"/>
                    <p>AI is analyzing your data... this may take a moment.</p>
                </div>
            )}
           {error && !isGenerating && (
                <div className="mt-4 text-destructive">
                    <p>Error: {error}</p>
                </div>
            )}
         </CardContent>
       </Card>
      )}

      {reportHtml && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Your Generated Report</CardTitle>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4"/>
              Print / Download
            </Button>
          </CardHeader>
          <CardContent>
            <iframe
              ref={iframeRef[1]}
              srcDoc={reportHtml}
              className="w-full h-[800px] border rounded-md"
              title="Budget Report"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
