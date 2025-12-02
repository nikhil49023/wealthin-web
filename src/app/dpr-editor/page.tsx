
'use client';

import {
  useState,
  useEffect,
  useCallback,
  Suspense
} from 'react';
import {
  Button
} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Input
} from '@/components/ui/input';
import {
  Label
} from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Progress
} from '@/components/ui/progress';
import {
  Loader2,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import {
  useToast
} from '@/hooks/use-toast';
import {
  generateDprAction
} from '@/app/actions';
import type {
  GenerateDprOutput,
  GenerateDprInput
} from '@/ai/schemas/dpr';
import {
  useRouter,
  useSearchParams
} from 'next/navigation';
import type {
  GenerateInvestmentIdeaAnalysisOutput
} from '@/ai/schemas/investment-idea-analysis';
import { Textarea } from '@/components/ui/textarea';

const msmeServiceCategories = [
  'IT / Software Services',
  'Retail / E-commerce',
  'Construction / Real Estate',
  'Manufacturing',
  'Food & Agro Processing',
  'Hospitality & Tourism',
  'Healthcare & Pharma',
  'Logistics & Supply Chain',
  'Professional Services (Accounting, Legal, etc.)',
  'Textiles & Apparel',
  'Other',
];

function DPREditorComponent() {
  const {
    toast
  } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState < Partial < GenerateDprInput >> ({
    idea: '',
    promoterName: '',
    projectDescription: '',
    projectCategory: '',
    state: '',
    city: '',
    udyam: '',
    promoterExperience: '',
    promoterQualification: '',
    totalProjectCost: '',
    promoterContribution: '',
    loanRequired: '',
    expectedRevenue: '',
    profitMargin: '',
    targetMarket: '',
    competitiveAdvantage: '',
    identifiedRisks: '',
    mitigationStrategies: '',
    businessModel: '',
    locationAndSite: '',
    technicalFeasibility: '',
    implementationSchedule: '',
    swotAnalysis: '',
    regulatoryCompliance: '',
    riskAssessment: '',
    annexures: '',
    financialProjections: { // Initialize with empty values
      isMock: true,
      summaryText: '',
      projectCost: '',
      meansOfFinance: '',
      costBreakdown: [],
      yearlyProjections: [],
      profitabilityAnalysis: '',
      cashFlowStatement: '',
      loanRepaymentSchedule: '',
      breakEvenAnalysis: ''
    }
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [dprData, setDprData] = useState < GenerateDprOutput | null > (null);
  const [view, setView] = useState < 'quiz' | 'editor' | 'loading' > ('quiz');

  useEffect(() => {
    const ideaTitle = searchParams.get('idea');
    const promoterName = searchParams.get('name');
    const storedAnalysisJSON = localStorage.getItem('dprAnalysis');

    let analysis: GenerateInvestmentIdeaAnalysisOutput | null = null;
    if (storedAnalysisJSON) {
      try {
        analysis = JSON.parse(storedAnalysisJSON);
      } catch (e) {
        console.error("Failed to parse dprAnalysis from localStorage", e);
      }
    }

    setFormData(prev => ({
      ...prev,
      idea: analysis || { title: ideaTitle || '' },
      promoterName: promoterName || '',
      projectDescription: analysis?.summary || '',
      targetMarket: analysis?.targetAudience || '',
      competitiveAdvantage: analysis?.roi || '', // ROI can be part of competitive advantage
    }));
  }, [searchParams]);

  const steps = [{
      field: 'projectName',
      title: 'Project Information',
      description: 'Tell us about your MSME project.'
    },
    {
      field: 'location',
      title: 'Location & Registration',
      description: 'Provide your business location and registration details.'
    },
    {
      field: 'promoterDetails',
      title: 'Promoter Details',
      description: 'Tell us about the entrepreneur.'
    },
    {
      field: 'financials',
      title: 'Financial Requirements',
      description: 'Outline your project costs and funding needs.'
    },
    {
      field: 'projections',
      title: 'Financial Projections',
      description: 'Provide your revenue and profitability estimates.'
    },
    {
      field: 'market',
      title: 'Market & Competition',
      description: 'Describe your target market and unique advantages.'
    },
    {
      field: 'risks',
      title: 'Risk Assessment',
      description: 'Identify potential risks and how you will mitigate them.'
    },
    {
      field: 'media',
      title: 'Final Details',
      description: 'Final details before generating the report.'
    },
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev,
      [field]: value
    }));
  };

  const handleGenerateDPR = async () => {
    setIsLoading(true);
    setView('loading');
    toast({
      title: 'Generating Your DPR...',
      description: 'The AI is building your report. This may take a minute.',
    });

    try {
      const result = await generateDprAction(formData as GenerateDprInput);
      if (result.success) {
        setDprData(result.data);
        localStorage.setItem('generatedDpr', JSON.stringify(result.data));
        router.push('/dpr-report');

      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message || 'An unexpected error occurred.',
      });
      setView('quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const renderQuizStep = () => {
    return steps.map((step, i) => (
      <div key={step.field} className={currentStep === i ? 'block' : 'hidden'}>
        <Card>
          <CardContent className="p-6">
            {i === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={((formData.idea as GenerateInvestmentIdeaAnalysisOutput)?.title) || ''}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectCategory">Project Category</Label>
                  <Select onValueChange={value => handleChange('projectCategory' as any, value)} defaultValue={(formData as any).projectCategory}>
                    <SelectTrigger id="projectCategory">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {msmeServiceCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="projectDescription">Project Description</Label>
                  <Textarea
                    id="projectDescription"
                    value={(formData as any).projectDescription || ''}
                    onChange={e => handleChange('projectDescription' as any, e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}
            {i === 1 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input id="state" value={(formData as any).state || ''} onChange={e => handleChange('state' as any, e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" value={(formData as any).city || ''} onChange={e => handleChange('city' as any, e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="udyam">UDYAM Registration No. (if any)</Label>
                        <Input id="udyam" value={(formData as any).udyam || ''} onChange={e => handleChange('udyam' as any, e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="locationAndSite">Site/Location Details</Label>
                        <Textarea id="locationAndSite" value={(formData as any).locationAndSite || ''} onChange={e => handleChange('locationAndSite' as any, e.target.value)} placeholder="e.g., Leased space in an industrial area, address, size..."/>
                    </div>
                </div>
            )}
             {i === 2 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="promoterName">Promoter Name</Label>
                        <Input id="promoterName" value={formData.promoterName || ''} onChange={e => handleChange('promoterName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="promoterExperience">Experience (in years)</Label>
                        <Input type="number" id="promoterExperience" value={(formData as any).promoterExperience || ''} onChange={e => handleChange('promoterExperience' as any, e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="promoterQualification">Qualification</Label>
                        <Input id="promoterQualification" value={(formData as any).promoterQualification || ''} onChange={e => handleChange('promoterQualification' as any, e.target.value)} />
                    </div>
                </div>
            )}
             {i === 3 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="totalProjectCost">Total Project Cost (INR)</Label>
                        <Input type="number" id="totalProjectCost" value={(formData as any).totalProjectCost || ''} onChange={e => handleChange('totalProjectCost' as any, e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="promoterContribution">Promoter's Contribution (INR)</Label>
                        <Input type="number" id="promoterContribution" value={(formData as any).promoterContribution || ''} onChange={e => handleChange('promoterContribution' as any, e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="loanRequired">Loan Required (INR)</Label>
                        <Input type="number" id="loanRequired" value={(formData as any).loanRequired || ''} onChange={e => handleChange('loanRequired' as any, e.target.value)} />
                    </div>
                </div>
            )}
             {i === 4 && (
                 <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="expectedRevenue">Expected Annual Revenue (Year 1, INR)</Label>
                        <Input type="number" id="expectedRevenue" value={(formData as any).expectedRevenue || ''} onChange={e => handleChange('expectedRevenue' as any, e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="profitMargin">Expected Profit Margin (%)</Label>
                        <Input type="number" id="profitMargin" value={(formData as any).profitMargin || ''} onChange={e => handleChange('profitMargin' as any, e.target.value)} />
                    </div>
                </div>
            )}
            {i === 5 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="targetMarket">Target Market</Label>
                  <Textarea
                    id="targetMarket"
                    value={(formData as any).targetMarket || ''}
                    onChange={e => handleChange('targetMarket' as any, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="competitiveAdvantage">Competitive Advantage</Label>
                  <Textarea
                    id="competitiveAdvantage"
                    value={(formData as any).competitiveAdvantage || ''}
                    onChange={e => handleChange('competitiveAdvantage' as any, e.target.value)}
                  />
                </div>
              </div>
            )}
             {i === 6 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="identifiedRisks">Identified Risks</Label>
                        <Textarea id="identifiedRisks" value={(formData as any).identifiedRisks || ''} onChange={e => handleChange('identifiedRisks' as any, e.target.value)} placeholder="e.g., Market competition, supply chain disruption..."/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mitigationStrategies">Mitigation Strategies</Label>
                        <Textarea id="mitigationStrategies" value={(formData as any).mitigationStrategies || ''} onChange={e => handleChange('mitigationStrategies' as any, e.target.value)} placeholder="e.g., Diversify suppliers, focus on a niche market..."/>
                    </div>
                </div>
            )}
            {i === 7 && (
                 <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="businessModel">Business Model</Label>
                        <Textarea id="businessModel" value={(formData as any).businessModel || ''} onChange={e => handleChange('businessModel' as any, e.target.value)} placeholder="e.g., B2B sales to local restaurants, direct to consumer via website..."/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="technicalFeasibility">Technical Implementation</Label>
                        <Textarea id="technicalFeasibility" value={(formData as any).technicalFeasibility || ''} onChange={e => handleChange('technicalFeasibility' as any, e.target.value)} placeholder="Describe the machinery, technology, and process flow..."/>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    ));
  };


  if (view === 'loading') {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center">
        <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
        <h2 className="text-2xl font-semibold">AI is Building Your DPR...</h2>
        <p className="text-muted-foreground">This may take a moment. Please do not refresh.</p>
      </div>
    );
  }

  if (view === 'editor' && dprData) {
    // This view is now handled by the /dpr-report page
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 mb-8">
        <Progress value={progress} />
        <div className="text-center">
          <h1 className="text-2xl font-bold">{currentStepData.title}</h1>
          <p className="text-muted-foreground">{currentStepData.description}</p>
        </div>
      </div>

      {renderQuizStep()}

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
          <ArrowLeft className="mr-2" /> Back
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button onClick={handleNext}>
            Next <ArrowRight className="ml-2" />
          </Button>
        ) : (
          <Button onClick={handleGenerateDPR} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : null}
            Generate DPR
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DPREditorPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <DPREditorComponent />
    </Suspense>
  );
}
