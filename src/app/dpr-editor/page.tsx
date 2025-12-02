
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { DprQuizData } from '@/ai/schemas/dpr';
import Link from 'next/link';
import { generateDprSectionAction } from '@/app/actions';
import { dprSectionConfig } from '@/lib/dpr-config';
import { Progress } from '@/components/ui/progress';

export default function DPREditorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [quizData, setQuizData] = useState<DprQuizData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const storedData = localStorage.getItem('dprQuizData');
    if (storedData) {
      try {
        setQuizData(JSON.parse(storedData));
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load your project data. Please start over.',
        });
        router.push('/brainstorm');
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'No Data Found',
        description: 'Please complete the DPR quiz first.',
      });
      router.push('/brainstorm');
    }
    setIsLoading(false);
  }, [router, toast]);
  
  const handleGenerateDpr = async () => {
    if (!quizData) {
        toast({ variant: 'destructive', description: 'Quiz data is missing.' });
        return;
    }
    
    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);
    setGenerationStatus('Starting generation...');

    const sectionsContent: { key: string; content: any }[] = [];
    
    try {
        for (const [index, section] of dprSectionConfig.entries()) {
            setGenerationStatus(`Generating: ${section.title}...`);
            const result = await generateDprSectionAction({
                idea: quizData,
                section: section.key,
                basePrompt: section.prompt,
            });

            if (result.success && result.data.content) {
                sectionsContent.push({ key: section.key, content: result.data.content });
                setGenerationProgress(((index + 1) / dprSectionConfig.length) * 100);
            } else {
                throw new Error(result.error || `Failed to generate section: ${section.title}`);
            }
        }
        
        // Store the final generated content
        localStorage.setItem('dprGeneratedContent', JSON.stringify(sectionsContent));

        // Navigate to the final report page
        router.push('/dpr-report');

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

  if (isLoading || !quizData) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
        <Button variant="ghost" asChild className="-ml-4">
          <Link href="/my-ideas">
            <ArrowLeft className="mr-2" />
            Back to My Ideas
          </Link>
        </Button>

        {isGenerating ? (
            <Card>
                <CardHeader className="text-center">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4"/>
                    <CardTitle>Generating Your DPR</CardTitle>
                    <CardDescription>The AI is building your report. Please wait...</CardDescription>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                    <Progress value={generationProgress} className="w-full" />
                    <p className="text-center text-sm text-muted-foreground mt-2">{generationStatus}</p>
                </CardContent>
            </Card>
        ) : error ? (
            <Card className="text-center bg-red-50 border-red-200">
                <CardHeader>
                    <div className="mx-auto bg-red-100 h-16 w-16 rounded-full flex items-center justify-center border-4 border-red-200">
                        <AlertTriangle className="h-8 w-8 text-red-600"/>
                    </div>
                    <CardTitle className="mt-4 text-2xl text-destructive">Generation Failed</CardTitle>
                    <CardDescription className="text-red-700">{error}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" onClick={handleGenerateDpr}>Retry Generation</Button>
                </CardContent>
            </Card>
        ) : (
            <Card className="text-center">
                <CardHeader>
                    <div className="mx-auto bg-green-100 h-16 w-16 rounded-full flex items-center justify-center border-4 border-green-200">
                        <CheckCircle className="h-8 w-8 text-green-600"/>
                    </div>
                    <CardTitle className="mt-4 text-2xl">Quiz Completed!</CardTitle>
                    <CardDescription>
                        All necessary data for your Detailed Project Report has been collected.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <p className="text-muted-foreground">Project Name:</p>
                        <p className="font-semibold text-lg">{quizData.projectName}</p>
                    </div>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        You can now proceed to generate the full, formatted DPR document with our AI.
                    </p>
                    <Button onClick={handleGenerateDpr} size="lg">
                        <FileText className="mr-2"/>
                        Generate Full DPR
                    </Button>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
