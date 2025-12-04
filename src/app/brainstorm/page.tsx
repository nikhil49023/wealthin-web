
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  Send,
  Lightbulb,
  Building2,
  Landmark,
  TrendingUp,
  Briefcase,
  BookOpen,
  Sprout,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Shield,
  Heart,
  PieChart,
  Combine,
  Loader2,
  X,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { doc, getFirestore, setDoc, updateDoc, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { generateInvestmentIdeaAnalysisAction, generateIdeaSectionAction } from '@/app/actions';
import type { ExtractedTransaction } from '@/ai/schemas/transactions';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import { FormattedText } from '@/components/wealthin/formatted-text';
import { Skeleton } from '@/components/ui/skeleton';

const db = getFirestore(app);

const governmentSchemes = [
    {
        title: "Public Provident Fund (PPF)",
        description: "A long-term, government-backed savings scheme with tax benefits, ideal for retirement planning.",
        icon: Shield,
        compatibilityContext: "Is the Public Provident Fund (PPF) a good investment for me, considering my financial situation?",
    },
    {
        title: "National Pension System (NPS)",
        description: "A voluntary, defined contribution retirement savings scheme designed to enable a systematic saving habit.",
        icon: TrendingUp,
        compatibilityContext: "Should I invest in the National Pension System (NPS)? Analyze its suitability for me.",
    },
    {
        title: "Sukanya Samriddhi Yojana (SSY)",
        description: "A small savings scheme specifically for the girl child, offering a high interest rate and tax benefits.",
        icon: Heart,
        compatibilityContext: "Is the Sukanya Samriddhi Yojana a suitable scheme for my family's goals?",
    },
    {
        title: "Senior Citizens' Saving Scheme (SCSS)",
        description: "A secure investment option for senior citizens, providing a regular income stream post-retirement.",
        icon: Landmark,
        compatibilityContext: "Tell me if the Senior Citizens' Saving Scheme is a good fit for my portfolio.",
    },
];

const investmentCategories = [
    {
        title: "Equity Mutual Funds",
        description: "Invest in a diversified portfolio of stocks. Categories include Large, Mid, Small, and Multi-Cap funds.",
        icon: PieChart,
        compatibilityContext: "Are Equity Mutual Funds a good choice for my investment strategy? What are the risks?",
    },
    {
        title: "Debt Mutual Funds",
        description: "A relatively safer investment option that invests in fixed-income securities like bonds and government securities.",
        icon: FileText,
        compatibilityContext: "Explain Debt Mutual Funds and tell me if they are right for me.",
    },
    {
        title: "Hybrid & Other Funds",
        description: "A mix of equity and debt to balance risk and return. Includes balanced advantage, multi-asset, and arbitrage funds.",
        icon: Combine,
        compatibilityContext: "What are Hybrid Funds, and should I consider them for my financial goals?",
    },
    {
        title: "Direct Equity (Stocks)",
        description: "Directly own shares of companies listed on indices like Nifty 50 and Sensex. Higher risk, higher potential reward.",
        icon: Building2,
        compatibilityContext: "Is investing directly in stocks a good idea for me? What should I be careful about?",
    },
];

const curatedIdeas = [
    {
        title: "Digital Marketing Agency for MSMEs",
        category: "Services",
        description: "Provide affordable social media management, SEO, and content creation services for small businesses.",
        icon: BookOpen,
        idea: "Digital Marketing Agency for local MSMEs"
    },
    {
        title: "Organic Farming & Delivery",
        category: "AgriTech",
        description: "Cultivate and deliver fresh, organic produce directly to consumers in urban areas through a subscription model.",
        icon: Sprout,
        idea: "Organic Farming & Delivery service"
    },
    {
        title: "Online Tutoring Platform",
        category: "EdTech",
        description: "Connect students with tutors for various subjects, leveraging the demand for online education.",
        icon: GraduationCap,
        idea: "Online Tutoring Platform for K-12 students"
    },
    {
        title: "Eco-Friendly Packaging Production",
        category: "Manufacturing",
        description: "Manufacture and supply biodegradable packaging solutions to local businesses.",
        icon: Sparkles,
        idea: "Eco-Friendly Packaging Production"
    }
];

const analysisSections: {
  key: keyof Omit<GenerateInvestmentIdeaAnalysisOutput, 'title' | 'summary'>;
  title: string;
  icon: React.ElementType;
}[] = [
  { key: 'investmentStrategy', title: 'Investment Strategy', icon: Briefcase },
  { key: 'targetAudience', title: 'Target Audience & Marketing', icon: Target },
  { key: 'roi', title: 'Return on Investment (ROI)', icon: TrendingUp },
  { key: 'futureProofing', title: 'Future-Proofing & Scalability', icon: Shield },
  { key: 'relevantSchemes', title: 'Relevant Government Schemes', icon: Landmark },
  { key: 'legalRequirements', title: 'Legal & Regulatory Requirements', icon: FileText },
];

const IDEA_ANALYSIS_COST = 2;

export default function BrainstormPage() {
  const { toast } = useToast();
  const [userIdea, setUserIdea] = useState('');
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Partial<GenerateInvestmentIdeaAnalysisOutput> | null>(null);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [currentIdea, setCurrentIdea] = useState('');
  
  useEffect(() => {
    if (user) {
      const transactionsRef = collection(db, 'users', user.uid, 'transactions');
      const q = query(transactionsRef, orderBy('date', 'desc'), limit(20));
      const unsubscribe = onSnapshot(q, snapshot => {
        setTransactions(snapshot.docs.map(doc => doc.data() as ExtractedTransaction));
      },
      (error) => {
        console.error("Error fetching transactions for brainstorm page:", error);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleAnalyzeIdea = useCallback(async (ideaToAnalyze: string) => {
    if (!ideaToAnalyze.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter an idea to analyze.' });
      return;
    }
    if (!user || !userProfile) {
      toast({ variant: 'destructive', description: 'Please log in to analyze an idea.'});
      router.push('/login');
      return;
    }
    if ((userProfile.credits ?? 0) < IDEA_ANALYSIS_COST) {
      setShowLimitAlert(true);
      return;
    }
    
    setIsAnalyzing(true);
    setCurrentIdea(ideaToAnalyze);
    setAnalysisDialogOpen(true);
    setAnalysisResult(null);

    // Step 1: Generate Title and Summary
    const initialResult = await generateInvestmentIdeaAnalysisAction({ idea: ideaToAnalyze, transactions });
    if (!initialResult.success) {
      toast({ variant: 'destructive', title: 'Analysis Failed', description: initialResult.error });
      setIsAnalyzing(false);
      setAnalysisDialogOpen(false);
      return;
    }

    setAnalysisResult({
      title: initialResult.data.title,
      summary: initialResult.data.summary,
    });
    
    // Step 2: Generate each section sequentially
    let finalAnalysis: Partial<GenerateInvestmentIdeaAnalysisOutput> = { ...initialResult.data };

    for (const section of analysisSections) {
      try {
        const sectionResult = await generateIdeaSectionAction({
          idea: ideaToAnalyze,
          section: section.key,
        });

        if (sectionResult.success && sectionResult.data.content) {
          finalAnalysis[section.key] = sectionResult.data.content;
          setAnalysisResult(prev => ({ ...prev, [section.key]: sectionResult.data.content }));
        } else {
          throw new Error(sectionResult.error || `Failed to generate content for ${section.title}`);
        }
      } catch (err: any) {
        setAnalysisResult(prev => ({ ...prev, [section.key]: `<p class="text-destructive">${err.message}</p>` }));
      }
    }
    
    // Step 3: Deduct credits after successful analysis
    const userDocRef = doc(db, 'users', user.uid);
    const newCredits = (userProfile.credits ?? 0) - IDEA_ANALYSIS_COST;
    updateDoc(userDocRef, { credits: newCredits }).catch((e) => {
        console.error("Failed to deduct credits:", e);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path, operation: 'update', requestResourceData: { credits: newCredits }
        }));
    });

    setIsAnalyzing(false);
  }, [user, userProfile, transactions, toast, router]);

  const handleDialogClose = () => {
    setAnalysisDialogOpen(false);
    setAnalysisResult(null);
    setCurrentIdea('');
  };

  const handleCompatibilityCheck = (context: string) => {
    if (!user) {
        toast({ variant: 'destructive', description: 'Please log in to use the AI Advisor.' });
        router.push('/login');
        return;
    }
    router.push(`/ai-advisor?q=${encodeURIComponent(context)}`);
  };

  return (
    <div className="space-y-8">
       <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><Landmark className="text-primary"/>Government Schemes</CardTitle>
          <CardDescription>Click a scheme to check its compatibility with your financial profile using AI.</CardDescription>
        </CardHeader>
        <CardContent>
             <Carousel opts={{ align: 'start', loop: false }} className="w-full">
                <CarouselContent>
                    {governmentSchemes.map((item) => (
                        <CarouselItem key={item.title} className="md:basis-1/2">
                           <Card className="h-full hover:border-primary transition-colors cursor-pointer p-1" onClick={() => handleCompatibilityCheck(item.compatibilityContext)}>
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-lg">
                                            <item.icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <CardTitle className="text-lg">{item.title}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                </CardContent>
                            </Card>
                        </CarouselItem>
                    ))}
                 </CarouselContent>
                 <CarouselPrevious className="hidden md:flex" />
                 <CarouselNext className="hidden md:flex" />
            </Carousel>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <h2 className="text-2xl font-bold flex items-center gap-2">Curated Business Ideas</h2>
            <p className="text-muted-foreground">Explore some popular ideas to get started. Click any idea to analyze it instantly.</p>
        </CardHeader>
        <CardContent>
           <Carousel opts={{ align: 'start', loop: false }} className="w-full">
                <CarouselContent>
                    {curatedIdeas.map((idea, index) => (
                        <CarouselItem key={index} className="md:basis-1/2">
                            <Card 
                            className="h-full flex flex-col justify-between cursor-pointer hover:border-primary transition-colors p-1" 
                            onClick={() => handleAnalyzeIdea(idea.idea)}
                            >
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg leading-tight">{idea.title}</CardTitle>
                                        <div className="p-2 bg-primary/10 rounded-md">
                                            <idea.icon className="h-5 w-5 text-primary" />
                                        </div>
                                    </div>
                                        <Badge variant="secondary" className="w-fit">{idea.category}</Badge>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{idea.description}</p>
                                </CardContent>
                            </Card>
                        </CarouselItem>
                    ))}
                 </CarouselContent>
                 <CarouselPrevious className="hidden md:flex" />
                 <CarouselNext className="hidden md:flex" />
            </Carousel>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
            <CardTitle>Analyze Your Own Idea</CardTitle>
             <CardDescription>Have a different idea? Describe it below to get a detailed analysis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
              placeholder="e.g., 'A subscription box service for regional Indian sweets...'"
              value={userIdea}
              onChange={e => setUserIdea(e.target.value)}
              rows={3}
              className="text-base"
            />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button onClick={() => userIdea ? router.push(`/investment-ideas/custom?idea=${encodeURIComponent(userIdea)}`) : toast({variant: 'destructive', description: 'Please enter an idea.'})} size="lg">
                <Send className="mr-2" />
                Get Full Analysis Page
            </Button>
            <Button variant="outline" asChild>
              <Link href="/my-ideas">
                <Lightbulb className="mr-2" />
                My Saved Ideas
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><Briefcase className="text-primary"/>Explore Investment Categories</CardTitle>
          <CardDescription>Click a category to check its suitability for your portfolio.</CardDescription>
        </CardHeader>
        <CardContent>
            <Carousel opts={{ align: 'start', loop: false }} className="w-full">
                <CarouselContent>
                    {investmentCategories.map((item) => (
                        <CarouselItem key={item.title} className="md:basis-1/2">
                           <Card className="h-full hover:border-primary transition-colors cursor-pointer p-1" onClick={() => handleCompatibilityCheck(item.compatibilityContext)}>
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-lg">
                                            <item.icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <CardTitle className="text-lg">{item.title}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                </CardContent>
                            </Card>
                        </CarouselItem>
                    ))}
                 </CarouselContent>
                 <CarouselPrevious className="hidden md:flex" />
                 <CarouselNext className="hidden md:flex" />
            </Carousel>
        </CardContent>
      </Card>

      <AlertDialog open={showLimitAlert} onOpenChange={setShowLimitAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insufficient Credits</AlertDialogTitle>
            <AlertDialogDescription>
              You do not have enough credits to perform this action. An idea analysis costs {IDEA_ANALYSIS_COST} credits. You can recharge your credits on your profile page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowLimitAlert(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={analysisDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            {isAnalyzing && !analysisResult ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" />
                <DialogTitle>Analyzing {currentIdea}...</DialogTitle>
              </div>
            ) : analysisResult?.title ? (
              <>
                <DialogTitle>{analysisResult.title}</DialogTitle>
                <DialogDescription>{analysisResult.summary}</DialogDescription>
              </>
            ) : <Skeleton className="h-8 w-3/4" />}
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto space-y-6">
            {analysisSections.map((section, index) => (
                <div key={section.key}>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <section.icon className="h-5 w-5 text-primary" />
                        {section.title}
                    </h3>
                    {analysisResult && analysisResult[section.key] ? (
                        <FormattedText text={analysisResult[section.key] as string}/>
                    ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin"/>
                            <span>Generating...</span>
                        </div>
                    )}
                </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
