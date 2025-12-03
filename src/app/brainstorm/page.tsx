
'use client';

import { useState, useRef, useEffect } from 'react';
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
import { generateInvestmentIdeaAnalysisAction } from '@/app/actions';
import type { ExtractedTransaction } from '@/ai/schemas/transactions';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import { FormattedText } from '@/components/financify/formatted-text';

const db = getFirestore(app);

const governmentSchemes = [
    {
        title: "Public Provident Fund (PPF)",
        description: "A long-term, government-backed savings scheme with tax benefits, ideal for retirement planning.",
        icon: Shield,
        href: "https://www.indiapost.gov.in/Financial/Pages/Content/Post-Office-Saving-Schemes.aspx"
    },
    {
        title: "National Pension System (NPS)",
        description: "A voluntary, defined contribution retirement savings scheme designed to enable a systematic saving habit.",
        icon: TrendingUp,
        href: "https://npscra.nsdl.co.in/what-is-nps.php"
    },
    {
        title: "Sukanya Samriddhi Yojana (SSY)",
        description: "A small savings scheme specifically for the girl child, offering a high interest rate and tax benefits.",
        icon: Heart,
        href: "https://www.indiapost.gov.in/Financial/Pages/Content/Post-Office-Saving-Schemes.aspx"
    },
    {
        title: "Senior Citizens' Saving Scheme (SCSS)",
        description: "A secure investment option for senior citizens, providing a regular income stream post-retirement.",
        icon: Landmark,
        href: "https://www.indiapost.gov.in/Financial/Pages/Content/Post-Office-Saving-Schemes.aspx"
    },
];

const investmentCategories = [
    {
        title: "Equity Mutual Funds",
        description: "Invest in a diversified portfolio of stocks. Categories include Large, Mid, Small, and Multi-Cap funds.",
        icon: PieChart,
        href: "#"
    },
    {
        title: "Debt Mutual Funds",
        description: "A relatively safer investment option that invests in fixed-income securities like bonds and government securities.",
        icon: FileText,
        href: "#"
    },
    {
        title: "Hybrid & Other Funds",
        description: "A mix of equity and debt to balance risk and return. Includes balanced advantage, multi-asset, and arbitrage funds.",
        icon: Combine,
        href: "#"
    },
    {
        title: "Direct Equity (Stocks)",
        description: "Directly own shares of companies listed on indices like Nifty 50 and Sensex. Higher risk, higher potential reward.",
        icon: Building2,
        href: "#"
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

const IDEA_ANALYSIS_COST = 2;

export default function BrainstormPage() {
  const { toast } = useToast();
  const [userIdea, setUserIdea] = useState('');
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GenerateInvestmentIdeaAnalysisOutput | null>(null);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  
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

  const handleAnalyzeIdea = async (ideaToAnalyze: string) => {
    if (!ideaToAnalyze.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter an idea to analyze.',
      });
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
    setAnalysisDialogOpen(true);
    setAnalysisResult(null); // Clear previous results
    
    const initialAnalysisResult = await generateInvestmentIdeaAnalysisAction({ idea: ideaToAnalyze, transactions });

    if (!initialAnalysisResult.success) {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: initialAnalysisResult.error,
      });
      setIsAnalyzing(false);
      setAnalysisDialogOpen(false);
      return;
    }

    setAnalysisResult(initialAnalysisResult.data);
    
    // Deduct credits after successful analysis
    const userDocRef = doc(db, 'users', user.uid);
    const newCredits = (userProfile.credits ?? 0) - IDEA_ANALYSIS_COST;

    updateDoc(userDocRef, { credits: newCredits })
      .then(() => {
        toast({
            title: 'Credits Deducted',
            description: `You have been charged ${IDEA_ANALYSIS_COST} credits. Remaining: ${newCredits}`,
        });
      })
      .catch((e) => {
        console.error("Failed to deduct credits:", e);
        const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: { credits: newCredits }
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not deduct credits. Please try again.',
        });
      });

    setIsAnalyzing(false);
  };
  
  const handleDialogClose = () => {
    setAnalysisDialogOpen(false);
    setAnalysisResult(null);
  };

  return (
    <div className="space-y-8">
       <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><Landmark className="text-primary"/>Government Schemes</CardTitle>
          <CardDescription>Explore popular government-backed investment schemes for secure, long-term growth.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {governmentSchemes.map((item) => (
              <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer" className="h-full">
                <Card className="h-full hover:border-primary transition-colors cursor-pointer">
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
              </a>
          ))}
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <header>
            <h2 className="text-2xl font-bold flex items-center gap-2">Curated Business Ideas</h2>
            <p className="text-muted-foreground">Explore some popular ideas to get started. Click any idea to analyze it instantly.</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {curatedIdeas.map((idea, index) => (
            <Card 
              key={index} 
              className="h-full flex flex-col justify-between cursor-pointer hover:border-primary transition-colors" 
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
          ))}
        </div>
      </div>

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
            <Button onClick={() => handleAnalyzeIdea(userIdea)} disabled={!userIdea.trim() || isAnalyzing} size="lg">
                {isAnalyzing && !analysisResult ? (
                  <Loader2 className="mr-2 animate-spin" />
                ) : (
                  <Send className="mr-2" />
                )}
                {isAnalyzing && !analysisResult ? 'Analyzing...' : `Get AI Insights (${IDEA_ANALYSIS_COST} Credits)`}
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
          <CardDescription>Learn about different categories to diversify your portfolio.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {investmentCategories.map((item) => (
              <Link key={item.title} href={item.href}>
                <Card className="h-full hover:border-primary transition-colors cursor-pointer">
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
              </Link>
          ))}
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
            {isAnalyzing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" />
                <DialogTitle>Analyzing Idea...</DialogTitle>
              </div>
            ) : analysisResult ? (
              <>
                <DialogTitle>{analysisResult.title}</DialogTitle>
                <DialogDescription>{analysisResult.summary}</DialogDescription>
              </>
            ) : null}
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto space-y-4">
            {isAnalyzing ? (
              <p className="text-muted-foreground text-center">AI is generating insights, please wait...</p>
            ) : analysisResult ? (
                Object.entries(analysisResult).map(([key, value]) => {
                  if (key !== 'title' && key !== 'summary' && value) {
                    const section = curatedIdeas.find(s => s.idea === key) || { title: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) };
                    return (
                        <div key={key}>
                            <h3 className="font-semibold text-lg mb-2">{section.title}</h3>
                            <FormattedText text={value as string}/>
                        </div>
                    );
                  }
                  return null;
                })
            ) : (
                 <p className="text-destructive-foreground text-center">Could not load analysis.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    