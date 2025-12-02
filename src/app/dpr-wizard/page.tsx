'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';

const initialFormData = {
  promoterName: '',
  businessName: '',
  businessType: '',
  location: '',
  projectDesc: '',
  totalCost: '',
  loanAmount: '',
};

const wizardSteps = [
  {
    title: 'Promoter & Business Details',
    fields: ['promoterName', 'businessName', 'businessType'],
  },
  {
    title: 'Project Details',
    fields: ['location', 'projectDesc'],
  },
  {
    title: 'Financial Requirements',
    fields: ['totalCost', 'loanAmount'],
  },
];

export default function DPRWizardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideaAnalysis, setIdeaAnalysis] = useState<GenerateInvestmentIdeaAnalysisOutput | null>(null);

  useEffect(() => {
    const storedAnalysis = localStorage.getItem('dprAnalysis');
    if (storedAnalysis) {
      const parsed = JSON.parse(storedAnalysis);
      setIdeaAnalysis(parsed);
      setFormData(prev => ({
        ...prev,
        businessName: parsed.title || '',
        projectDesc: parsed.summary || '',
      }));
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No business idea found. Please analyze an idea first.',
        });
        router.push('/brainstorm');
    }

    if (user?.displayName) {
        setFormData(prev => ({ ...prev, promoterName: user.displayName! }));
    }
  }, [user, router, toast]);

  const handleNext = () => {
    const currentFields = wizardSteps[step].fields;
    const isStepValid = currentFields.every(field => formData[field as keyof typeof formData]);
    if (!isStepValid) {
        toast({ variant: 'destructive', description: 'Please fill out all fields for this step.' });
        return;
    }
    if (step < wizardSteps.length - 1) {
      setDirection(1);
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(prev => prev - 1);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateDPR = async () => {
    const isStepValid = wizardSteps[step].fields.every(field => formData[field as keyof typeof formData]);
    if (!isStepValid) {
        toast({ variant: 'destructive', description: 'Please fill out all fields for this step.' });
        return;
    }
    
    setIsGenerating(true);
    
    if (!ideaAnalysis) {
        toast({variant: 'destructive', description: 'Idea analysis not found.'});
        setIsGenerating(false);
        return;
    }

    // Now navigate to the report page, passing the collected info
    // The report page will be responsible for the actual AI generation
    localStorage.setItem('dprFormData', JSON.stringify(formData));
    router.push(`/dpr-report?idea=${encodeURIComponent(ideaAnalysis.title)}&name=${encodeURIComponent(formData.promoterName)}`);
  };

  const progress = ((step + 1) / (wizardSteps.length)) * 100;
  const currentStepData = wizardSteps[step];

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 300 : -300, opacity: 0 }),
  };

  const renderStepContent = (stepIndex: number) => {
    const { fields } = wizardSteps[stepIndex];
    return (
      <div className="space-y-4">
        {fields.includes('promoterName') && (
          <div className="space-y-2">
            <Label htmlFor="promoterName">Promoter Name</Label>
            <Input id="promoterName" value={formData.promoterName} onChange={e => handleChange('promoterName', e.target.value)} />
          </div>
        )}
        {fields.includes('businessName') && (
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input id="businessName" value={formData.businessName} onChange={e => handleChange('businessName', e.target.value)} />
          </div>
        )}
        {fields.includes('businessType') && (
          <div className="space-y-2">
            <Label htmlFor="businessType">Nature of Business</Label>
            <Select value={formData.businessType} onValueChange={value => handleChange('businessType', value)}>
              <SelectTrigger id="businessType"><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="trading">Trading</SelectItem>
                <SelectItem value="agriculture">Agriculture</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {fields.includes('location') && (
          <div className="space-y-2">
            <Label htmlFor="location">Project Location</Label>
            <Input id="location" placeholder="e.g., Hyderabad, Telangana" value={formData.location} onChange={e => handleChange('location', e.target.value)} />
          </div>
        )}
        {fields.includes('projectDesc') && (
          <div className="space-y-2">
            <Label htmlFor="projectDesc">Project Description</Label>
            <Textarea id="projectDesc" rows={5} value={formData.projectDesc} onChange={e => handleChange('projectDesc', e.target.value)} />
          </div>
        )}
        {fields.includes('totalCost') && (
            <div className="space-y-2">
                <Label htmlFor="totalCost">Total Project Cost (in ₹)</Label>
                <Input id="totalCost" type="number" placeholder="e.g., 500000" value={formData.totalCost} onChange={e => handleChange('totalCost', e.target.value)} />
            </div>
        )}
        {fields.includes('loanAmount') && (
            <div className="space-y-2">
                <Label htmlFor="loanAmount">Bank Loan Required (in ₹)</Label>
                <Input id="loanAmount" type="number" placeholder="e.g., 400000" value={formData.loanAmount} onChange={e => handleChange('loanAmount', e.target.value)} />
            </div>
        )}
      </div>
    );
  };
  
  if (!ideaAnalysis) {
      return (
        <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <Button variant="ghost" onClick={() => router.back()} className="-ml-4">
            <ArrowLeft className="mr-2" />
            Back
       </Button>
      <div className="text-center">
        <h1 className="text-3xl font-bold">DPR Generation Wizard</h1>
        <p className="text-muted-foreground mt-2">Fill in the details to generate your bank-ready report.</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <Progress value={progress} className="mb-4" />
          <CardTitle>{currentStepData.title}</CardTitle>
          <CardDescription>Step {step + 1} of {wizardSteps.length}</CardDescription>
        </CardHeader>
        <div className="relative h-96">
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                    key={step}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                    className="absolute w-full px-6"
                >
                    {renderStepContent(step)}
                </motion.div>
            </AnimatePresence>
        </div>
        <CardFooter className="flex justify-between border-t pt-4">
            <Button variant="outline" onClick={handleBack} disabled={step === 0 || isGenerating}>
                <ArrowLeft className="mr-2"/>
                Back
            </Button>
            {step < wizardSteps.length - 1 ? (
                <Button onClick={handleNext}>
                    Next <ArrowRight className="ml-2"/>
                </Button>
            ) : (
                <Button onClick={handleGenerateDPR} disabled={isGenerating}>
                    {isGenerating && <Loader2 className="mr-2 animate-spin" />}
                    {isGenerating ? 'Processing...' : 'Generate DPR'}
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
