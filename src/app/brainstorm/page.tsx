
'use client';

import { useState, useRef } from 'react';
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
  DollarSign,
  PieChart,
  Megaphone,
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
import Autoplay from "embla-carousel-autoplay"
import React from 'react';
import { doc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { generateInvestmentIdeaAnalysisAction } from '@/app/actions';

const db = getFirestore(app);

const investmentWays = [
    { 
        title: "Start an Enterprise", 
        description: "Analyze a business idea and create a detailed project report.", 
        icon: Building2,
        href: "#" // Changed to # to handle click manually
    },
    { 
        title: "Government Schemes", 
        description: "Explore central and state schemes for personal investment and savings.", 
        icon: Landmark,
        href: "/launchpad" 
    },
    { 
        title: "Stock Market", 
        description: "Learn about investing in equities for long-term wealth creation.", 
        icon: TrendingUp,
        href: "#" 
    },
    { 
        title: "Mutual Funds", 
        description: "Diversify your investments with professionally managed funds.", 
        icon: Briefcase,
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

const courses = [
    { 
        title: "Financial Literacy for Entrepreneurs", 
        description: "Master budgeting, cash flow, and financial planning for your business.", 
        icon: DollarSign,
        href: "#"
    },
    { 
        title: "Digital Marketing Fundamentals", 
        description: "Learn how to market your product or service online effectively.", 
        icon: Megaphone,
        href: "#" 
    },
    { 
        title: "Business Plan Development", 
        description: "A step-by-step guide to creating a bank-ready business plan.", 
        icon: PieChart,
        href: "#" 
    },
    { 
        title: "Sales and Customer Acquisition", 
        description: "Strategies to find your first customers and grow your revenue.", 
        icon: TrendingUp,
        href: "#"
    },
];


const IDEA_ANALYSIS_COST = 2;

export default function BrainstormPage() {
  const { toast } = useToast();
  const [userIdea, setUserIdea] = useState('');
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const curatedIdeasRef = useRef<HTMLDivElement>(null);

  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  )

  const handleScrollToIdeas = () => {
    curatedIdeasRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      router.push('/');
      return;
    }

    if ((userProfile.credits ?? 0) < IDEA_ANALYSIS_COST) {
      setShowLimitAlert(true);
      return;
    }
    
    // First, generate the initial analysis to ensure it works before deducting credits.
    const initialAnalysisResult = await generateInvestmentIdeaAnalysisAction({ idea: ideaToAnalyze });

    if (!initialAnalysisResult.success) {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: initialAnalysisResult.error,
      });
      return;
    }

    // If initial analysis is successful, *then* deduct credits.
    const userDocRef = doc(db, 'users', user.uid);
    const newCredits = (userProfile.credits ?? 0) - IDEA_ANALYSIS_COST;

    updateDoc(userDocRef, { credits: newCredits })
      .then(() => {
        toast({
            title: 'Credits Deducted',
            description: `You have been charged ${IDEA_ANALYSIS_COST} credits. Remaining: ${newCredits}`,
        });
        // Now navigate to the analysis page
        router.push(`/investment-ideas/custom?idea=${encodeURIComponent(ideaToAnalyze)}`);
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
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><Sparkles className="text-primary"/>Investment Ways in India</CardTitle>
          <CardDescription>Explore different ways to grow your wealth and build your enterprise.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {investmentWays.map((item) => {
            const isEnterpriseCard = item.title === "Start an Enterprise";
            const CardComponent = (
                <Card className="h-full hover:border-primary transition-colors cursor-pointer" onClick={isEnterpriseCard ? handleScrollToIdeas : undefined}>
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
            );

            return isEnterpriseCard ? (
              <div key={item.title}>{CardComponent}</div>
            ) : (
              <Link key={item.title} href={item.href}>
                {CardComponent}
              </Link>
            );
          })}
        </CardContent>
      </Card>
      
      <div className="space-y-4" ref={curatedIdeasRef}>
        <header>
            <h2 className="text-2xl font-bold flex items-center gap-2">Curated Business Ideas</h2>
            <p className="text-muted-foreground">Explore some popular ideas to get started. Click any idea to analyze it instantly.</p>
        </header>

        <Carousel 
            opts={{ align: "start", loop: true }}
            plugins={[plugin.current]}
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
            className="w-full"
        >
          <CarouselContent className="-ml-4">
            {curatedIdeas.map((idea, index) => (
              <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <div className="p-1 h-full">
                  <Card className="h-full flex flex-col justify-between cursor-pointer" onClick={() => handleAnalyzeIdea(idea.idea)}>
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
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-[-10px] sm:left-[-20px]" />
          <CarouselNext className="absolute right-[-10px] sm:right-[-20px]" />
        </Carousel>
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
            <Button onClick={() => handleAnalyzeIdea(userIdea)} disabled={!userIdea.trim()} size="lg">
                <Send className="mr-2" /> Get AI Insights ({IDEA_ANALYSIS_COST} Credits)
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
          <CardTitle className="text-2xl flex items-center gap-2"><GraduationCap className="text-primary"/>Recommended Courses</CardTitle>
          <CardDescription>Upskill yourself with these courses tailored for entrepreneurs.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map((item) => (
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
    </div>
  );
}
