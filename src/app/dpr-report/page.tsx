
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function DPRReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  
  useEffect(() => {
    const ideaTitle = searchParams.get('idea');
    const promoterName = searchParams.get('name');
    const storedAnalysis = localStorage.getItem('dprAnalysis');
    
    if (!ideaTitle || !promoterName || !storedAnalysis) {
        setError("Missing required information to generate the report. Please start over.");
        setIsGenerating(false);
        return;
    }

    const generateReport = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const analysis: GenerateInvestmentIdeaAnalysisOutput = JSON.parse(storedAnalysis);
            if (analysis.title !== ideaTitle) {
                throw new Error("Mismatched analysis data found.");
            }

            const response = await fetch('/api/generate-dpr-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea: analysis, promoterName })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || "Failed to generate the report from the server.");
            }

            const html = await response.text();
            setReportHtml(html);

        } catch (err: any) {
            setError(err.message);
            toast({ variant: 'destructive', title: 'Generation Failed', description: err.message });
        } finally {
            setIsGenerating(false);
        }
    };
    
    generateReport();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, toast]);


  return (
    <div className="space-y-8">
        {isGenerating && (
            <Card className="text-center py-20">
                <CardContent className="space-y-4">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                    <h3 className="text-xl font-semibold">Generating Your DPR...</h3>
                    <p className="text-muted-foreground">The AI is building your report. This might take up to a minute.</p>
                </CardContent>
            </Card>
        )}

        {error && !isGenerating && (
            <Card className="text-center py-10 bg-destructive/10 border-destructive">
                <CardContent className="space-y-4">
                    <h3 className="text-xl font-semibold text-destructive">Generation Failed</h3>
                    <p className="text-destructive/80">{error}</p>
                     <Button variant="outline" asChild className="mt-4">
                        <Link href="/brainstorm">Back to Brainstorm</Link>
                    </Button>
                </CardContent>
            </Card>
        )}
        
        {reportHtml && !isGenerating && (
            <iframe
                ref={iframeRef}
                srcDoc={reportHtml}
                className="w-full h-[80vh] border rounded-md"
                title="Detailed Project Report"
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
    )
}
