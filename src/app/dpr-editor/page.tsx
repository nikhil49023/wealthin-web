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
} from 'lucide-react';
import type { DprQuizData } from '@/ai/schemas/dpr';
import Link from 'next/link';

export default function DPREditorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [quizData, setQuizData] = useState<DprQuizData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  
  const handleStartGeneration = () => {
      // The actual generation now happens on the report page
      router.push('/dpr-report');
  }

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
                <Button onClick={handleStartGeneration} size="lg">
                    <FileText className="mr-2"/>
                    Start AI Generation
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
