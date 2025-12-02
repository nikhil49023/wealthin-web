
'use client';

import {
  useState,
  useEffect,
  useCallback
} from 'react';
import {
  Button
} from '@/components/ui/button';
import {
  Card,
  CardContent
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
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';

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

export default function DPREditorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState < Partial < GenerateDprInput >> ({
    idea: '',
    promoterName: ''
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
        projectName: analysis?.title || ideaTitle || '',
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
      title: 'Project Images',
      description: 'Upload relevant images for your project.'
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
        setView('editor');
        toast({
          title: 'DPR Generated!',
          description: 'Your report is ready for review.',
        });
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
    return steps.map((step, i) => ( <
      div key = {
        step.field
      }
      className = {
        currentStep === i ? 'block' : 'hidden'
      } >
      <
      Card >
      <
      CardContent className = "p-6" > {
        /* Common fields for most steps can go here */ } {
        i === 0 && ( <
          >
          <
          div className = "space-y-2 mb-4" >
          <
          Label htmlFor = "projectName" > Project Name < /Label> <
          Input id = "projectName"
          value = {
            (formData as any).projectName || ''
          }
          onChange = {
            e => handleChange('projectName', e.target.value)
          }
          /> <
          /div> <
          div className = "space-y-2 mb-4" >
          <
          Label htmlFor = "projectCategory" > Project Category < /Label> <
          Select onValueChange = {
            value => handleChange('projectCategory', value)
          }
          defaultValue = {
            (formData as any).projectCategory
          } >
          <
          SelectTrigger id = "projectCategory" >
          <
          SelectValue placeholder = "Select a category" / >
          <
          /SelectTrigger> <
          SelectContent > {
            msmeServiceCategories.map(cat => ( <
              SelectItem key = {
                cat
              }
              value = {
                cat
              } > {
                cat
              } < /SelectItem>
            ))
          } <
          /SelectContent> <
          /Select> <
          /div> <
          / >
        )
      }

      {
        i === 5 && ( <
          >
          <
          div className = "space-y-2 mb-4" >
          <
          Label htmlFor = "targetMarket" > Target Market < /Label> <
          Input id = "targetMarket"
          value = {
            (formData as any).targetMarket || ''
          }
          onChange = {
            e => handleChange('targetMarket', e.target.value)
          }
          /> <
          /div> <
          div className = "space-y-2 mb-4" >
          <
          Label htmlFor = "competitiveAdvantage" > Competitive Advantage < /Label> <
          Input id = "competitiveAdvantage"
          value = {
            (formData as any).competitiveAdvantage || ''
          }
          onChange = {
            e => handleChange('competitiveAdvantage', e.target.value)
          }
          /> <
          /div> <
          />
        )
      } <
      p className = "text-sm text-muted-foreground" > For brevity, only some fields are shown. < /p> <
      /CardContent> <
      /Card> <
      /div>
    ));
  };


  if (view === 'loading') {
    return ( <
      div className = "flex flex-col justify-center items-center h-full text-center" >
      <
      Loader2 className = "h-12 w-12 animate-spin mb-4 text-primary" / >
      <
      h2 className = "text-2xl font-semibold" > AI is Building Your DPR... < /h2> <
      p className = "text-muted-foreground" > This may take a moment.Please do not refresh. < /p> <
      /div>
    );
  }

  if (view === 'editor' && dprData) {
    return ( <
      div >
      <
      h1 > DPR Editor < /h1> <
      pre > {
        JSON.stringify(dprData, null, 2)
      } < /pre> <
      /div>
    );
  }

  return ( <
    div className = "max-w-2xl mx-auto" >
    <
    div className = "space-y-4 mb-8" >
    <
    Progress value = {
      progress
    }
    /> <
    div className = "text-center" >
    <
    h1 className = "text-2xl font-bold" > {
      currentStepData.title
    } < /h1> <
    p className = "text-muted-foreground" > {
      currentStepData.description
    } < /p> <
    /div> <
    /div>

    {
      renderQuizStep()
    }

    <
    div className = "flex justify-between mt-8" >
    <
    Button variant = "outline"
    onClick = {
      handleBack
    }
    disabled = {
      currentStep === 0
    } >
    <
    ArrowLeft className = "mr-2" / > Back <
    /Button> {
      currentStep < steps.length - 1 ? ( <
        Button onClick = {
          handleNext
        } >
        Next < ArrowRight className = "ml-2" / >
        <
        /Button>
      ) : ( <
        Button onClick = {
          handleGenerateDPR
        }
        disabled = {
          isLoading
        } > {
          isLoading ? < Loader2 className = "mr-2 animate-spin" / > : null
        }
        Generate DPR <
        /Button>
      )
    } <
    /div> <
    /div>
  );
}

    