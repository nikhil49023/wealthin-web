'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  User,
  Building,
  Banknote,
  TrendingUp,
  Shield,
  FlaskConical,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DprQuizData } from '@/ai/schemas/dpr';

// Helper function for currency formatting
const formatIndianCurrency = (value: number) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}k`;
  }
  return `₹${value}`;
};

const quizSteps = [
  {
    key: 'projectInfo',
    title: 'Business Basics',
    icon: FileText,
    fields: ['projectName', 'businessType', 'businessDescription'],
  },
  {
    key: 'promoterInfo',
    title: 'About You',
    icon: User,
    fields: ['promoterName', 'education', 'experience'],
  },
  {
    key: 'marketInfo',
    title: 'Your Customers & Competitors',
    icon: Building,
    fields: ['targetMarket', 'competitors', 'marketingStrategy'],
  },
  {
    key: 'technicalInfo',
    title: 'Location & Technology',
    icon: FlaskConical,
    fields: ['location', 'siteDetails', 'registrationType'],
  },
  {
    key: 'financials',
    title: 'Money Required',
    icon: Banknote,
    fields: ['projectCost', 'loanAmount'],
  },
  {
    key: 'projections',
    title: 'Future Earnings',
    icon: TrendingUp,
    fields: ['revenueY1', 'profitMargin'],
  },
  {
    key: 'risks',
    title: 'Risks & Strengths',
    icon: Shield,
    fields: ['risks', 'mitigation'],
  },
   {
    key: 'schedule',
    title: 'Project Timeline',
    icon: Calendar,
    fields: [],
  },
];

const initialFormData: DprQuizData = {
  projectName: '',
  businessType: 'Textile Manufacturing',
  businessDescription: '',
  location: '',
  siteDetails: '',
  registrationType: 'Fully automatic',
  promoterName: '',
  education: '',
  experience: '',
  projectCost: 15000000,
  loanAmount: 10000000,
  revenueY1: 5000000,
  profitMargin: 20,
  targetMarket: '',
  competitors: '',
  marketingStrategy: '12% year-on-year growth',
  risks: '',
  mitigation: '',
};

export default function DPREditorPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<DprQuizData>(initialFormData);
  const [direction, setDirection] = useState(1);
  
  useEffect(() => {
    if (userProfile?.displayName) {
      setFormData(prev => ({...prev, promoterName: userProfile.displayName || ''}));
    }
  }, [userProfile]);


  const handleQuizChange = (field: keyof DprQuizData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < quizSteps.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleGenerateDpr = async () => {
    localStorage.setItem('dprQuizData', JSON.stringify(formData));
    localStorage.removeItem('generatedDpr');
    router.push('/dpr-report');
  };

  const renderQuizStep = () => {
    const { key } = quizSteps[currentStep];

    switch (key) {
      case 'projectInfo':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Let's start with the basics of your new business.</p>
            <Input placeholder="What will you call your business? (e.g., Rama Textiles)" value={formData.projectName} onChange={(e) => handleQuizChange('projectName', e.target.value)} />
            <Input placeholder="What kind of work will it do? (e.g., Making clothes)" value={formData.businessType} onChange={(e) => handleQuizChange('businessType', e.target.value)} />
            <Textarea placeholder="In one sentence, what is the main aim? (e.g., 'To make and sell good quality clothes to local shops')" value={formData.businessDescription} onChange={(e) => handleQuizChange('businessDescription', e.target.value)} />
          </div>
        );
      case 'promoterInfo':
         return (
          <div className="space-y-4">
             <p className="text-sm text-muted-foreground">Tell us about the person starting the business.</p>
            <Input placeholder="What is your full name?" value={formData.promoterName} onChange={(e) => handleQuizChange('promoterName', e.target.value)} />
            <Input placeholder="What is your highest education? (e.g., 12th Pass, B.Com)" value={formData.education} onChange={(e) => handleQuizChange('education', e.target.value)} />
            <Textarea placeholder="Tell us about your work experience. Have you done this kind of work before?" value={formData.experience} onChange={(e) => handleQuizChange('experience', e.target.value)} />
          </div>
        );
      case 'marketInfo':
          return (
            <div className="space-y-4">
               <p className="text-sm text-muted-foreground">Who will you sell to, and how?</p>
              <Textarea placeholder="Who are your main customers? (e.g., 'People in my town', 'Other shops')" value={formData.targetMarket} onChange={(e) => handleQuizChange('targetMarket', e.target.value)} />
              <Textarea placeholder="Why will people choose you? (e.g., 'My price is lower', 'My quality is better')" value={formData.competitors} onChange={(e) => handleQuizChange('competitors', e.target.value)} />
              <Input placeholder="How is the market for your product? (e.g., 'Demand is growing fast')" value={formData.marketingStrategy} onChange={(e) => handleQuizChange('marketingStrategy', e.target.value)} />
            </div>
          );
      case 'technicalInfo':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Details about your workplace and machines.</p>
            <Input placeholder="Where will your business be located? (Village/Town, District)" value={formData.location} onChange={(e) => handleQuizChange('location', e.target.value)} />
            <Textarea placeholder="Why did you choose this place? (e.g., 'It is my own land', 'It is near the main road')" value={formData.siteDetails} onChange={(e) => handleQuizChange('siteDetails', e.target.value)} />
            <Input placeholder="What kind of machines will you use? (e.g., 'Automatic machines')" value={formData.registrationType} onChange={(e) => handleQuizChange('registrationType', e.target.value)} />
          </div>
        );
      case 'financials':
          return (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">Let's talk about the money needed.</p>
              <div>
                  <Label>Total Money to Start the Business: {formatIndianCurrency(formData.projectCost)}</Label>
                  <Slider value={[formData.projectCost]} onValueChange={([v]) => handleQuizChange('projectCost', v)} max={100000000} step={100000} />
              </div>
              <div>
                  <Label>Loan Required from Bank: {formatIndianCurrency(formData.loanAmount)}</Label>
                  <Slider value={[formData.loanAmount]} onValueChange={([v]) => handleQuizChange('loanAmount', v)} max={formData.projectCost} step={100000} />
              </div>
               <div>
                  <Label>Your Own Investment: {formatIndianCurrency(formData.projectCost - formData.loanAmount)}</Label>
                   <p className="text-xs text-muted-foreground">This is the money you are putting in from your own pocket.</p>
              </div>
            </div>
          );
       case 'projections':
          return (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">Guess your earnings for the first year.</p>
              <div>
                  <Label>Expected First Year Sales: {formatIndianCurrency(formData.revenueY1)}</Label>
                  <Slider value={[formData.revenueY1]} onValueChange={([v]) => handleQuizChange('revenueY1', v)} max={500000000} step={500000} />
              </div>
              <div>
                  <Label>Expected Profit (in %): {formData.profitMargin}%</Label>
                  <Slider value={[formData.profitMargin]} onValueChange={([v]) => handleQuizChange('profitMargin', v)} max={80} step={1} />
                   <p className="text-xs text-muted-foreground">Out of every ₹100 in sales, how much will be your profit?</p>
              </div>
               <Input placeholder="What are your main expenses? (e.g., 'Buying material', 'Paying workers')" value={formData.workingCapital?.toString()} onChange={(e) => handleQuizChange('workingCapital', e.target.value)} />
            </div>
          );
      case 'risks':
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Let's think about good and bad things that can happen.</p>
              <Textarea placeholder="What are your strengths? What are your weaknesses?" value={formData.risks} onChange={(e) => handleQuizChange('risks', e.target.value)} />
              <Textarea placeholder="What problems might you face and how will you solve them?" value={formData.mitigation} onChange={(e) => handleQuizChange('mitigation', e.target.value)} />
            </div>
          );
      case 'schedule':
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Finally, let's set a timeline for your project.</p>
                <div className="space-y-2">
                    <Label>When do you plan to get the land?</Label>
                    <Input type="date" />
                </div>
                <div className="space-y-2">
                    <Label>How many months until you can start selling?</Label>
                    <Input type="number" placeholder="e.g., 6" />
                </div>
            </div>
        );
      default:
        return null;
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 30 : -30,
      opacity: 0,
    }),
  };

  const Icon = quizSteps[currentStep].icon;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="overflow-hidden">
        <CardHeader>
          <Progress value={((currentStep + 1) / quizSteps.length) * 100} className="mb-4 h-2" />
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
                {Icon && <Icon className="h-6 w-6 text-primary" />}
            </div>
            <CardTitle>{quizSteps[currentStep].title}</CardTitle>
          </div>
        </CardHeader>
        <div className="relative min-h-[250px] px-6">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
              className="absolute w-full px-6 left-0"
            >
              {renderQuizStep()}
            </motion.div>
          </AnimatePresence>
        </div>
        <CardFooter className="flex justify-between border-t pt-4 mt-8">
          <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0}>
            <ArrowLeft className="mr-2" /> Back
          </Button>
          {currentStep < quizSteps.length - 1 ? (
            <Button onClick={handleNext}>
              Next <ArrowRight className="ml-2" />
            </Button>
          ) : (
            <Button onClick={handleGenerateDpr}>
              Start Generation
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
