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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  FileText,
  User,
  Building,
  Banknote,
  TrendingUp,
  Shield,
  Lightbulb,
  Check,
  MapPin,
  FlaskConical,
  Paperclip,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DprQuizData, GenerateDprOutput } from '@/ai/schemas/dpr';
import { dprSectionConfig } from '@/lib/dpr-config';
import { generateDprSectionAction } from '@/app/actions';


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
    title: 'Project Details',
    icon: FileText,
    fields: ['projectName', 'businessType', 'businessDescription'],
  },
  {
    key: 'promoterInfo',
    title: 'Promoter Information',
    icon: User,
    fields: ['promoterName', 'education', 'experience'],
  },
  {
    key: 'marketInfo',
    title: 'Market & Business Model',
    icon: Building,
    fields: ['targetMarket', 'competitors', 'marketingStrategy'],
  },
  {
    key: 'technicalInfo',
    title: 'Technical & Location',
    icon: FlaskConical,
    fields: ['location', 'siteDetails'],
  },
  {
    key: 'financials',
    title: 'Financial Requirements',
    icon: Banknote,
    fields: ['projectCost', 'loanAmount'],
  },
  {
    key: 'projections',
    title: 'Financial Projections',
    icon: TrendingUp,
    fields: ['revenueY1', 'profitMargin'],
  },
  {
    key: 'risks',
    title: 'Risks & SWOT',
    icon: Shield,
    fields: ['risks', 'mitigation'],
  },
];

const initialFormData: DprQuizData = {
  projectName: '',
  businessType: 'Manufacturing',
  companyName: '',
  businessDescription: '',
  location: '',
  siteDetails: 'Leased',
  registrationType: 'Sole Proprietorship',
  promoterName: '',
  education: '',
  experience: '',
  projectCost: 1000000,
  workingCapital: 200000,
  loanAmount: 700000,
  promoterContribution: 300000,
  revenueY1: 2500000,
  profitMargin: 20,
  growthRate: 15,
  targetMarket: '',
  competitors: '',
  marketingStrategy: 'Digital marketing and local partnerships',
  risks: 'Market competition, supply chain disruption',
  mitigation: '',
  logoUrl: '',
  productImageUrl: '',
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
    // Store the quiz data in local storage
    localStorage.setItem('dprQuizData', JSON.stringify(formData));
    
    // Clear any previously generated DPR from storage to ensure a fresh start
    localStorage.removeItem('generatedDpr');
    
    // Redirect to the new report page which will handle the generation
    router.push('/dpr-report');
  };

  const renderQuizStep = () => {
    const { key } = quizSteps[currentStep];

    switch (key) {
      case 'projectInfo':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Let's start with the basics of your new venture.</p>
            <Input placeholder="Project Title (e.g., Automated Textile Unit)" value={formData.projectName} onChange={(e) => handleQuizChange('projectName', e.target.value)} />
            <Input placeholder="Industry/Sector (e.g., Textile Manufacturing)" value={formData.businessType} onChange={(e) => handleQuizChange('businessType', e.target.value)} />
            <Textarea placeholder="Objective & Rationale (e.g., To establish a 500 TPA garment unit to bridge local supply gaps...)" value={formData.businessDescription} onChange={(e) => handleQuizChange('businessDescription', e.target.value)} />
          </div>
        );
      case 'promoterInfo':
         return (
          <div className="space-y-4">
             <p className="text-sm text-muted-foreground">Tell us about the entrepreneur(s) behind the project.</p>
            <Input placeholder="Promoter Name(s)" value={formData.promoterName} onChange={(e) => handleQuizChange('promoterName', e.target.value)} />
            <Input placeholder="Education & Qualification (e.g., MBA, Finance)" value={formData.education} onChange={(e) => handleQuizChange('education', e.target.value)} />
            <Textarea placeholder="Relevant industry experience and track record..." value={formData.experience} onChange={(e) => handleQuizChange('experience', e.target.value)} />
          </div>
        );
      case 'marketInfo':
          return (
            <div className="space-y-4">
               <p className="text-sm text-muted-foreground">Describe your market and business model.</p>
              <Textarea placeholder="Target Audience (e.g., Wholesale distributors, retail chains...)" value={formData.targetMarket} onChange={(e) => handleQuizChange('targetMarket', e.target.value)} />
              <Textarea placeholder="Value Proposition & Competitors (e.g., Better quality at lower price compared to X & Y...)" value={formData.competitors} onChange={(e) => handleQuizChange('competitors', e.target.value)} />
              <Input placeholder="Market Trends (e.g., Market is growing at 12% CAGR...)" value={formData.marketingStrategy} onChange={(e) => handleQuizChange('marketingStrategy', e.target.value)} />
            </div>
          );
      case 'technicalInfo':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Details about the operational setup.</p>
            <Input placeholder="Location (e.g., Industrial Park, Visakhapatnam, AP)" value={formData.location} onChange={(e) => handleQuizChange('location', e.target.value)} />
            <Textarea placeholder="Location Advantage & Land Area (e.g., Near highway, 2 acres...)" value={formData.siteDetails} onChange={(e) => handleQuizChange('siteDetails', e.target.value)} />
            <Input placeholder="Technology & Production Capacity (e.g., Fully automatic, 500 TPA...)" value={formData.registrationType} onChange={(e) => handleQuizChange('registrationType', e.target.value)} />
          </div>
        );
      case 'financials':
          return (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">Let's talk numbers. Use the sliders to estimate your financial needs.</p>
              <div>
                  <Label>Total Project Cost: {formatIndianCurrency(formData.projectCost)}</Label>
                  <Slider value={[formData.projectCost]} onValueChange={([v]) => handleQuizChange('projectCost', v)} max={10000000} step={50000} />
              </div>
              <div>
                  <Label>Bank Loan Required: {formatIndianCurrency(formData.loanAmount)}</Label>
                  <Slider value={[formData.loanAmount]} onValueChange={([v]) => handleQuizChange('loanAmount', v)} max={formData.projectCost} step={50000} />
              </div>
               <div>
                  <Label>Promoter's Contribution: {formatIndianCurrency(formData.projectCost - formData.loanAmount)}</Label>
                   <p className="text-xs text-muted-foreground">This is automatically calculated based on the total cost and loan amount.</p>
              </div>
            </div>
          );
       case 'projections':
          return (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">Estimate your performance for the first year.</p>
              <div>
                  <Label>Projected First Year Revenue: {formatIndianCurrency(formData.revenueY1)}</Label>
                  <Slider value={[formData.revenueY1]} onValueChange={([v]) => handleQuizChange('revenueY1', v)} max={50000000} step={100000} />
              </div>
              <div>
                  <Label>Expected Profit Margin: {formData.profitMargin}%</Label>
                  <Slider value={[formData.profitMargin]} onValueChange={([v]) => handleQuizChange('profitMargin', v)} max={80} step={1} />
              </div>
               <Input placeholder="Major Expenses (e.g., Raw Materials: 40%, Labor: 30%)" value={formData.workingCapital?.toString()} onChange={(e) => handleQuizChange('workingCapital', e.target.value)} />
            </div>
          );
      case 'risks':
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Identify potential strengths, weaknesses, and risks.</p>
              <Textarea placeholder="Strengths, Weaknesses, Opportunities, Threats (SWOT)..." value={formData.risks} onChange={(e) => handleQuizChange('risks', e.target.value)} />
              <Textarea placeholder="Mitigation plan for the identified risks..." value={formData.mitigation} onChange={(e) => handleQuizChange('mitigation', e.target.value)} />
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
              <Check className="mr-2" /> Start Generation
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
