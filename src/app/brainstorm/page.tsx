
'use client';

import { useState } from 'react';
import {
  Send,
  Lightbulb,
  BookOpen,
  Sprout,
  GraduationCap,
  Sparkles,
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
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

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

  return (
    <div className="space-y-8">
      
       <Card className="bg-gradient-to-br from-primary/10 to-background">
        <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">Analyze Your Own Business Idea</CardTitle>
             <CardDescription className="text-base">Have a concept in mind? Describe it below to get a detailed, AI-powered analysis instantly.</CardDescription>
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
            <Button 
                onClick={() => userIdea ? router.push(`/investment-ideas/custom?idea=${encodeURIComponent(userIdea)}`) : toast({variant: 'destructive', description: 'Please enter an idea.'})} 
                size="lg"
            >
                <Send className="mr-2" />
                Analyze Idea
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
            <h2 className="text-2xl font-bold flex items-center gap-2">Or, Get Inspired</h2>
            <p className="text-muted-foreground">Explore some popular business ideas. Click any card to analyze it instantly.</p>
        </CardHeader>
        <CardContent>
           <Carousel opts={{ align: 'start', loop: false }} className="w-full">
                <CarouselContent>
                    {curatedIdeas.map((idea, index) => (
                        <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
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

    </div>
  );
}
