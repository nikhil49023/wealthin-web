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
import { generateDprSectionAction } from '@/app/actions';
import { dprSectionConfig } from '@/lib/dpr-config';
import type { DprQuizData } from '@/ai/schemas/dpr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function DPRReportContent() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [quizData, setQuizData] = useState<DprQuizData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const iframeRef = useState<HTMLIFrameElement | null>(null);


  const generateFullReport = useCallback(async (data: DprQuizData) => {
    setIsGenerating(true);
    setError(null);
    setReportHtml(null);

    try {
      // Generate all sections in parallel
      const sectionPromises = dprSectionConfig.map(sectionConf => 
        generateDprSectionAction({
            idea: data,
            section: sectionConf.key,
            basePrompt: sectionConf.prompt,
        })
      );

      const results = await Promise.all(sectionPromises);
      
      const sectionsContent: { key: string; content: any }[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.success && result.data.content) {
            sectionsContent.push({
                key: dprSectionConfig[i].key,
                content: result.data.content,
            });
        } else {
             // Push an error message into the content
            sectionsContent.push({
                key: dprSectionConfig[i].key,
                content: `<p class="text-red-500">Error generating this section.</p>`,
            });
            console.error(`Failed to generate section ${dprSectionConfig[i].title}:`, result.error);
        }
      }
      
      // Now, call the API to construct the final HTML
      const response = await fetch('/api/generate-dpr-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: sectionsContent, quizData: data }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Failed to construct final DPR document.');
      }
      
      const html = await response.text();
      setReportHtml(html);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during DPR generation.');
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: err.message,
      });
    } finally {
      setIsGenerating(false);
    }

  }, [toast]);

  // Load quiz data and start generation on mount
  useEffect(() => {
    const storedQuizData = localStorage.getItem('dprQuizData');
    if (storedQuizData) {
      try {
        const data = JSON.parse(storedQuizData);
        setQuizData(data);
        generateFullReport(data);
      } catch (e) {
        toast({ variant: 'destructive', description: 'Corrupted quiz data.' });
        router.push('/dpr-editor');
      }
    } else {
      toast({ variant: 'destructive', description: 'No quiz data found.' });
      router.push('/dpr-editor');
    }
  }, [router, toast, generateFullReport]);
  
  const handlePrint = () => {
    const iframe = iframeRef[0];
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <FileText />
                    Your Detailed Project Report
                </h1>
                <p className="text-muted-foreground">
                    A preview of your generated DPR. You can print or save it as a PDF.
                </p>
            </div>
            <Button variant="ghost" asChild className="-ml-4">
                <Link href="/dpr-editor">
                    <ArrowLeft className="mr-2" />
                    Back
                </Link>
            </Button>
        </div>

        {isGenerating && (
             <Card className="text-center py-16">
                <CardContent className="space-y-4">
                    <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
                    <h3 className="text-xl font-semibold">Generating Your DPR...</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">The AI is analyzing your data and building your report. This may take a minute.</p>
                </CardContent>
            </Card>
        )}

        {error && !isGenerating && (
             <Card className="text-center py-16 bg-red-50 border-red-200">
                <CardContent className="space-y-4">
                    <AlertTriangle className="h-16 w-16 mx-auto text-destructive" />
                    <h3 className="text-xl font-semibold text-destructive">Generation Failed</h3>
                    <p className="text-red-700 max-w-md mx-auto">{error}</p>
                    <Button variant="destructive" onClick={() => quizData && generateFullReport(quizData)}>
                        Retry Generation
                    </Button>
                </CardContent>
            </Card>
        )}

        {reportHtml && !isGenerating && (
             <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Generated Report Preview</CardTitle>
                    <Button onClick={handlePrint} variant="outline" size="sm">
                        <Printer className="mr-2 h-4 w-4"/>
                        Print / Save as PDF
                    </Button>
                </CardHeader>
                <CardContent>
                    <iframe
                    ref={iframeRef[1]}
                    srcDoc={reportHtml}
                    className="w-full h-[80vh] border rounded-md bg-white"
                    title="DPR Preview"
                    />
                </CardContent>
            </Card>
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