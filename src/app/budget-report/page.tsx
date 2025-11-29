
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

export default function BudgetReportPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const iframeRef = useState<HTMLIFrameElement | null>(null);

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
            body: JSON.stringify({ transactions })
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
              className="w-full h-[600px] border rounded-md"
              title="Budget Report"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
