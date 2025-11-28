
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Banknote,
  Loader2,
  Sparkles,
  FileText,
  Timer,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import { generateDprAction } from '@/app/actions';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/auth-provider';
import { FormattedText } from '@/components/wealthin/formatted-text';

const mockFinancialPrompt = `Generate a complete set of financial projections for a small-scale eco-friendly packaging manufacturing startup.
- The response must be a JSON object only.
- Add a new root-level key "isMock" and set its value to true.
- Initial Project Cost: 15 Lakhs (Machinery: 8 Lakhs, Working Capital: 5 Lakhs, Other: 2 Lakhs).
- Means of Finance: 5 Lakhs promoter contribution (equity), 10 Lakhs bank loan.
- Yearly Projections (3 years):
  - Year 1 Sales: 25 Lakhs, Profit: 3 Lakhs
  - Year 2 Sales: 40 Lakhs, Profit: 6 Lakhs
  - Year 3 Sales: 60 Lakhs, Profit: 10 Lakhs
- Assume a standard loan repayment schedule over 5 years.
- Keep the summary text, profitability analysis, and cash flow statement concise and positive.
`;

const dprChapters = [
    { key: 'executiveSummary', title: 'Executive Summary', prompt: 'Summarize the entire business project, including its mission, product/service, target market, and financial highlights. This should be a concise overview.' },
    { key: 'projectIntroduction', title: 'Project Introduction', prompt: 'Provide a detailed background of the project. Explain the problem it solves, its objectives, and its scope.' },
    { key: 'promoterDetails', title: 'Promoter Details', prompt: 'Describe the background of the promoter(s), including their experience, qualifications, and role in the project. Use the promoter\'s name provided.' },
    { key: 'businessModel', title: 'Business Model', prompt: 'Explain how the business will operate. Detail the revenue streams, value proposition, and key activities.' },
    { key: 'marketAnalysis', title: 'Market Analysis', prompt: 'Analyze the industry, market size, trends, and the target audience. Include an assessment of the competition.' },
    { key: 'locationAndSite', title: 'Location and Site', prompt: 'Describe the proposed location for the business, justifying its suitability in terms of infrastructure, accessibility, and market proximity.' },
    { key: 'technicalFeasibility', title: 'Technical Feasibility', prompt: 'Detail the technology, machinery, and processes required for production or service delivery. Include raw material sourcing.' },
    { key: 'implementationSchedule', title: 'Implementation Schedule', prompt: 'Outline a timeline for key project milestones, from setup to launch and full operation.' },
    { key: 'financialProjections', title: 'Financial Projections', prompt: 'Generate realistic financial projections including project cost, means of finance, cost breakdown, yearly sales and profit, profitability analysis, cash flow, loan repayment, and break-even analysis. This must be a detailed, multi-part JSON object.', isMockable: true },
    { key: 'swotAnalysis', title: 'SWOT Analysis', prompt: 'Conduct a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for the business.' },
    { key: 'regulatoryCompliance', title: 'Regulatory & Legal Compliance', prompt: 'List the licenses, permits, and other legal requirements applicable to the business in India.' },
    { key: 'riskAssessment', title: 'Risk Assessment', prompt: 'Identify potential risks (market, operational, financial) and propose mitigation strategies.' },
    { key: 'annexures', title: 'Annexures', prompt: 'List any supporting documents that would be attached, such as market research data, promoter CVs, or quotations for machinery.' }
];

type DprReport = {
    [key: string]: string | object;
};

function CustomizeDPRContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState(0); // 0: purpose, 1: generation
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [generatedReport, setGeneratedReport] = useState<DprReport>({});
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [timer, setTimer] = useState(10);
  
  const [analysis, setAnalysis] = useState<GenerateInvestmentIdeaAnalysisOutput | null>(null);
  const [promoterName, setPromoterName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const ideaTitle = searchParams.get('idea');
    const name = searchParams.get('name');
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
    
    if (name) {
      setPromoterName(name);
    } else if (user?.displayName) {
      setPromoterName(user.displayName);
    } else {
      setError('Could not identify promoter name.');
    }
  }, [searchParams, toast, user]);

  const startCooldown = () => {
    setIsWaiting(true);
    setTimer(10);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsWaiting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const generateNextSection = async () => {
    if (!analysis || !promoterName || currentChapterIndex >= dprChapters.length) return;

    setIsGenerating(true);
    setError(null);
    
    const chapter = dprChapters[currentChapterIndex];

    try {
      const result = await generateDprAction({
        idea: analysis,
        promoterName,
        section: chapter.key,
        basePrompt: chapter.isMockable ? mockFinancialPrompt : chapter.prompt,
      });

      if (result.success) {
        setGeneratedReport(prev => ({ ...prev, [chapter.key]: result.data.content }));
        startCooldown();
        setCurrentChapterIndex(prev => prev + 1);
      } else {
        throw new Error(result.error || `Failed to generate ${chapter.title}`);
      }
    } catch (e: any) {
      setError(`Failed during section: ${chapter.title}. Error: ${e.message}`);
      toast({ variant: 'destructive', title: `Error Generating ${chapter.title}`, description: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('generatedDPR', JSON.stringify(generatedReport));
    router.push(`/dpr-report?idea=${encodeURIComponent(analysis?.title || '')}`);
  };

  if (error && !isGenerating) {
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

  if (step === 1) {
    const isFinished = currentChapterIndex >= dprChapters.length;
    const progress = (currentChapterIndex / dprChapters.length) * 100;
    
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-center">Generating Your DPR</h1>
            <p className="text-muted-foreground text-center">The AI is building your report, section by section. Please review and continue.</p>
            
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <Progress value={progress} className="w-full" />
                    <p className="text-center text-sm font-semibold">
                        {isFinished ? "Report Generation Complete!" : `Step ${currentChapterIndex + 1} of ${dprChapters.length}: Generating "${dprChapters[currentChapterIndex].title}"`}
                    </p>
                </CardContent>
            </Card>

            {Object.keys(generatedReport).length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="text-green-500"/>
                          Last Generated Section: {dprChapters[currentChapterIndex - 1].title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                        <FormattedText text={JSON.stringify(generatedReport[dprChapters[currentChapterIndex - 1].key])} />
                    </CardContent>
                 </Card>
            )}

            <div className="flex justify-center">
                 {isFinished ? (
                    <Button onClick={handleFinish} size="lg">
                        View Full Report
                    </Button>
                ) : (
                    <Button onClick={generateNextSection} disabled={isGenerating || isWaiting} size="lg">
                        {isGenerating ? (
                            <Loader2 className="mr-2 animate-spin" />
                        ) : isWaiting ? (
                           <Timer className="mr-2" />
                        ) : null}
                        {isGenerating ? "Generating..." : isWaiting ? `Please wait... (${timer}s)` : "Generate Next Section"}
                    </Button>
                )}
            </div>
        </div>
    )
  }

  return (
      <div className="max-w-2xl mx-auto space-y-8">
         <Button variant="ghost" asChild className="-ml-4">
          <Link href="/brainstorm">
            <ArrowLeft className="mr-2" />
            Back to Brainstorm
          </Link>
        </Button>
        <div className="text-center">
            <h1 className="text-3xl font-bold">What is the purpose of this report?</h1>
            <p className="text-muted-foreground mt-2">
            Select a format below. The AI will tailor the DPR structure and tone for your chosen purpose.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
                className="p-6 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center gap-4"
                onClick={() => { setStep(1); generateNextSection(); }}
            >
                <Banknote className="h-12 w-12 text-primary" />
                <h3 className="font-semibold text-lg">Bank Loan Application</h3>
                <p className="text-xs text-muted-foreground">Generate the full report optimized for bank loan applications.</p>
            </Card>
             <Card 
                className="p-6 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center gap-4"
                onClick={() => { setStep(1); generateNextSection(); }}
             >
                <FileText className="h-12 w-12 text-primary" />
                <h3 className="font-semibold text-lg">Legal Documentation</h3>
                 <p className="text-xs text-muted-foreground">Generate a report focused on legal and regulatory compliance.</p>
            </Card>
        </div>
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

    