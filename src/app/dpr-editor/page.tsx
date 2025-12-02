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
    title: 'Project Information',
    icon: FileText,
    fields: ['projectName', 'businessType', 'companyName', 'businessDescription'],
  },
  {
    key: 'locationInfo',
    title: 'Location & Registration',
    icon: MapPin,
    fields: ['location', 'siteDetails', 'registrationType'],
  },
  {
    key: 'promoterInfo',
    title: 'Promoter Details',
    icon: User,
    fields: ['promoterName', 'education', 'experience'],
  },
  {
    key: 'financials',
    title: 'Financial Requirements',
    icon: Banknote,
    fields: ['projectCost', 'workingCapital', 'loanAmount', 'promoterContribution'],
  },
  {
    key: 'projections',
    title: 'Financial Projections',
    icon: TrendingUp,
    fields: ['revenueY1', 'profitMargin', 'growthRate'],
  },
  {
    key: 'market',
    title: 'Market & Competition',
    icon: Building,
    fields: ['targetMarket', 'competitors', 'marketingStrategy'],
  },
  {
    key: 'risks',
    title: 'Risk Assessment',
    icon: Shield,
    fields: ['risks', 'mitigation'],
  },
  {
    key: 'media',
    title: 'Supporting Documents',
    icon: Paperclip,
    fields: ['logoUrl', 'productImageUrl'],
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
  const [view, setView] = useState<'quiz' | 'loading' | 'editor'>('quiz');
  
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('Starting...');

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
    setView('loading');
    const generatedContent: { [key: string]: any } = {};

    try {
      for (let i = 0; i < dprSectionConfig.length; i++) {
        const section = dprSectionConfig[i];
        setGenerationStatus(`Generating ${section.title}...`);
        
        const result = await generateDprSectionAction({
            idea: formData,
            section: section.key,
            basePrompt: section.prompt,
        });

        if (result.success && result.data.content) {
            generatedContent[section.key] = result.data.content;
            setGenerationProgress(((i + 1) / dprSectionConfig.length) * 100);
        } else {
            throw new Error(result.error || `Failed to generate section: ${section.title}`);
        }
      }

      // Store the generated DPR in local storage
      localStorage.setItem('generatedDpr', JSON.stringify(generatedContent));
      // Store the base idea for refinement context
      localStorage.setItem('dprAnalysis', JSON.stringify({ title: formData.projectName, summary: formData.businessDescription }));

      toast({
        title: 'DPR Generated Successfully!',
        description: 'Redirecting you to the report editor...',
      });
      
      // Redirect to the editor page
      router.push('/dpr-report');

    } catch (e: any) {
      console.error('DPR Generation Error:', e);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: e.message,
      });
      setView('quiz'); // Go back to quiz on failure
    }
  };

  const renderQuizStep = () => {
    const { key } = quizSteps[currentStep];

    switch (key) {
      case 'projectInfo':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Tell us about your business idea.</p>
            <Input placeholder="Project Name (e.g., Organic Farm)" value={formData.projectName} onChange={(e) => handleQuizChange('projectName', e.target.value)} />
            <Textarea placeholder="Describe your business in one or two sentences." value={formData.businessDescription} onChange={(e) => handleQuizChange('businessDescription', e.target.value)} />
            <Select value={formData.businessType} onValueChange={(v) => handleQuizChange('businessType', v)}>
                <SelectTrigger><SelectValue placeholder="Select Business Type" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Services">Services</SelectItem>
                    <SelectItem value="Trading">Trading</SelectItem>
                    <SelectItem value="Agri-business">Agri-business</SelectItem>
                </SelectContent>
            </Select>
          </div>
        );
      case 'locationInfo':
        return (
          <div className="space-y-4">
             <p className="text-sm text-muted-foreground">Where will your business operate from?</p>
            <Input placeholder="Location (e.g., Visakhapatnam, AP)" value={formData.location} onChange={(e) => handleQuizChange('location', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
                <Button variant={formData.siteDetails === 'Owned' ? 'secondary': 'outline'} onClick={() => handleQuizChange('siteDetails', 'Owned')}>Owned</Button>
                <Button variant={formData.siteDetails === 'Leased' ? 'secondary': 'outline'} onClick={() => handleQuizChange('siteDetails', 'Leased')}>Leased</Button>
            </div>
          </div>
        );
      case 'promoterInfo':
         return (
          <div className="space-y-4">
             <p className="text-sm text-muted-foreground">Tell us a bit about yourself, the entrepreneur.</p>
            <Input placeholder="Your Full Name" value={formData.promoterName} onChange={(e) => handleQuizChange('promoterName', e.target.value)} />
            <Input placeholder="Highest Qualification (e.g., B.Tech)" value={formData.education} onChange={(e) => handleQuizChange('education', e.target.value)} />
            <Textarea placeholder="Your relevant experience (e.g., 5 years in marketing...)" value={formData.experience} onChange={(e) => handleQuizChange('experience', e.target.value)} />
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
                  <Label>Loan Amount Required: {formatIndianCurrency(formData.loanAmount)}</Label>
                  <Slider value={[formData.loanAmount]} onValueChange={([v]) => handleQuizChange('loanAmount', v)} max={formData.projectCost} step={50000} />
              </div>
               <div>
                  <Label>Your Contribution: {formatIndianCurrency(formData.projectCost - formData.loanAmount)}</Label>
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
            </div>
          );
      case 'market':
          return (
            <div className="space-y-4">
               <p className="text-sm text-muted-foreground">Who are your customers and competitors?</p>
              <Textarea placeholder="Describe your ideal customer (e.g., small businesses, urban families)." value={formData.targetMarket} onChange={(e) => handleQuizChange('targetMarket', e.target.value)} />
              <Textarea placeholder="List 1-2 main competitors and what makes you different." value={formData.competitors} onChange={(e) => handleQuizChange('competitors', e.target.value)} />
            </div>
          );
      case 'risks':
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">What are the potential challenges?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={formData.risks.includes('Market competition') ? 'secondary': 'outline'} onClick={() => handleQuizChange('risks', 'Market competition')}>Market Competition</Button>
                <Button variant={formData.risks.includes('Supply chain') ? 'secondary': 'outline'} onClick={() => handleQuizChange('risks', 'Supply chain')}>Supply Chain Issues</Button>
                <Button variant={formData.risks.includes('Regulatory changes') ? 'secondary': 'outline'} onClick={() => handleQuizChange('risks', 'Regulatory changes')}>Regulatory Changes</Button>
                <Button variant={formData.risks.includes('Economic downturn') ? 'secondary': 'outline'} onClick={() => handleQuizChange('risks', 'Economic downturn')}>Economic Downturn</Button>
              </div>
              <Textarea placeholder="Describe how you will handle these risks." value={formData.mitigation} onChange={(e) => handleQuizChange('mitigation', e.target.value)} />
            </div>
          );
       case 'media':
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Add links to your logo or product images (optional).</p>
              <Input placeholder="URL for your business logo" value={formData.logoUrl} onChange={(e) => handleQuizChange('logoUrl', e.target.value)} />
              <Input placeholder="URL for a product image" value={formData.productImageUrl} onChange={(e) => handleQuizChange('productImageUrl', e.target.value)} />
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

  if (view === 'loading') {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center py-20">
        <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
        <h2 className="text-2xl font-semibold">Generating Your DPR...</h2>
        <p className="text-muted-foreground mt-2 max-w-md">{generationStatus}</p>
        <Progress value={generationProgress} className="w-full max-w-sm mt-4" />
      </div>
    );
  }

  if (view === 'editor') {
    // This state is now effectively a loading state before redirect
    return (
        <div className="flex flex-col justify-center items-center h-full text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
            <h2 className="text-2xl font-semibold">Finalizing Report...</h2>
        </div>
    );
  }

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
              <Check className="mr-2" /> Generate DPR
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
