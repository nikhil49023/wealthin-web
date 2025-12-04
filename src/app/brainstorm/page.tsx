
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
        href: '/investment-ideas/custom?idea=Digital+Marketing+Agency+for+local+MSMEs',
    },
    {
        title: "Organic Farming & Delivery",
        category: "AgriTech",
        description: "Cultivate and deliver fresh, organic produce directly to consumers in urban areas through a subscription model.",
        icon: Sprout,
        href: '/investment-ideas/custom?idea=Organic+Farming+%26+Delivery+service',
    },
    {
        title: "Online Tutoring Platform",
        category: "EdTech",
        description: "Connect students with tutors for various subjects, leveraging the demand for online education.",
        icon: GraduationCap,
        href: '/investment-ideas/custom?idea=Online+Tutoring+Platform+for+K-12+students',
    },
    {
        title: "Eco-Friendly Packaging Production",
        category: "Manufacturing",
        description: "Manufacture and supply biodegradable packaging solutions to local businesses.",
        icon: Sparkles,
        href: '/investment-ideas/custom?idea=Eco-Friendly+Packaging+Production',
    }
];

export default function BrainstormPage() {
  const { toast } = useToast();
  const [userIdea, setUserIdea] = useState('');
  const router = useRouter();
  const { user } = useAuth();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{title: string, description: string, ideas: any[]}>({title: '', description: '', ideas: []});

  const handleCategoryClick = (category: {title: string, description: string, ideas: any[]}) => {
    setSelectedCategory(category);
    setDialogOpen(true);
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
                            <Link href={idea.href} className="h-full block">
                                <Card className="h-full flex flex-col justify-between cursor-pointer hover:border-primary transition-colors p-1">
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
                            </Link>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCategory.title}</DialogTitle>
            <DialogDescription>{selectedCategory.description}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {selectedCategory.ideas.map((idea: any) => (
                <Link href={idea.href} key={idea.title} className="block">
                    <Card className="hover:bg-accent/50 transition-colors">
                        <CardHeader>
                            <CardTitle className="text-base">{idea.title}</CardTitle>
                        </CardHeader>
                    </Card>
                </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
