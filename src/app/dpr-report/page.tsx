'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DprQuizData } from '@/ai/schemas/dpr';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

function DPRReportContent() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [quizData, setQuizData] = useState<DprQuizData | null>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const storedData = localStorage.getItem('dprQuizData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setQuizData(parsedData);
        handleGenerateDpr(parsedData);
      } catch (e) {
        setError('Could not load project data. Please start over.');
        setIsGenerating(false);
      }
    } else {
      setError('No DPR data found. Please complete the quiz first.');
      setIsGenerating(false);
    }
  }, []);

  const handleGenerateDpr = async (data: DprQuizData) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-dpr-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizData: data }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Failed to generate DPR from server.');
      }

      const html = await response.text();
      setReportHtml(html);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: err.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText />
            Detailed Project Report
          </h1>
          <p className="text-muted-foreground">
            Your final AI-generated report is below.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/my-ideas">
              <ArrowLeft className="mr-2" />
              Back to My Ideas
            </Link>
          </Button>
          {reportHtml && (
             <Button onClick={handlePrint}>
                <Printer className="mr-2" />
                Print / Save PDF
            </Button>
          )}
        </div>
      </div>

      {isGenerating && (
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>AI Is Generating Your Report</CardTitle>
            <CardDescription>This may take a minute. Please do not navigate away.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-full text-center py-10 gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing your data and writing content...</p>
          </CardContent>
        </Card>
      )}

      {error && !isGenerating && (
        <Card className="flex-1 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle /> Generation Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-10">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {!isGenerating && reportHtml && (
        <iframe
          ref={iframeRef}
          srcDoc={reportHtml}
          className="w-full flex-1 border rounded-md bg-white"
          title="DPR Preview"
        />
      )}
    </div>
  );
}

export default function DPRReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <DPRReportContent />
        </Suspense>
    );
}
