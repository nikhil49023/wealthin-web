
'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Printer,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { DprQuizData } from '@/ai/schemas/dpr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function DPRReportContent() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useState<HTMLIFrameElement | null>(null);

  const constructReport = useCallback(async (
      sectionsContent: { key: string; content: any }[],
      quizData: DprQuizData
    ) => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/generate-dpr-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sections: sectionsContent, quizData: quizData }),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'Failed to construct final DPR document.');
        }
      
        const html = await response.text();
        setReportHtml(html);
    } catch (err: any) {
        setError(err.message);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not construct the final report.' });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);


  // Load generated data from localStorage on mount
  useEffect(() => {
    const storedQuizData = localStorage.getItem('dprQuizData');
    const storedSections = localStorage.getItem('dprGeneratedContent');

    if (storedQuizData && storedSections) {
      try {
        const quizData = JSON.parse(storedQuizData);
        const sectionsContent = JSON.parse(storedSections);
        constructReport(sectionsContent, quizData);
      } catch (e) {
        setError('Failed to load generated report data. It might be corrupted.');
        toast({ variant: 'destructive', description: 'Corrupted report data.' });
        setIsLoading(false);
      }
    } else {
      setError('No generated report data found. Please generate the report first.');
      toast({ variant: 'destructive', description: 'No report data found.' });
      setIsLoading(false);
    }
  }, [router, toast, constructReport]);
  
  const handlePrint = () => {
    const iframe = iframeRef[0];
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  if (isLoading) {
    return (
        <div className="flex flex-col h-[80vh] justify-center items-center text-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-semibold">Constructing Your Report...</h3>
            <p className="text-muted-foreground">Please wait while we assemble the final document.</p>
        </div>
    );
  }

  if (error) {
      return (
        <Card className="text-center py-16 bg-red-50 border-red-200">
            <CardContent className="space-y-4">
                <AlertTriangle className="h-16 w-16 mx-auto text-destructive" />
                <h3 className="text-xl font-semibold text-destructive">Failed to Load Report</h3>
                <p className="text-red-700 max-w-md mx-auto">{error}</p>
                <Button variant="outline" onClick={() => router.push('/dpr-editor')}>
                    Go Back
                </Button>
            </CardContent>
        </Card>
      );
  }


  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-4">
       <div className="flex justify-between items-center flex-shrink-0">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText />
                    Your Detailed Project Report
                </h1>
                <p className="text-muted-foreground text-sm">
                    A preview of your generated DPR. You can print or save it as a PDF.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" asChild className="-ml-4">
                    <Link href="/dpr-editor">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Link>
                </Button>
                <Button onClick={handlePrint} variant="outline" size="sm">
                    <Printer className="mr-2 h-4 w-4"/>
                    Print / Save
                </Button>
            </div>
        </div>

        {reportHtml && (
             <div className="flex-grow w-full h-full">
                <iframe
                    ref={iframeRef[1]}
                    srcDoc={reportHtml}
                    className="w-full h-full border rounded-md bg-white"
                    title="DPR Preview"
                />
            </div>
        )}
    </div>
  );
}

export default function DPRReportPageWithSuspense() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <DPRReportContent />
    </Suspense>
  );
}
