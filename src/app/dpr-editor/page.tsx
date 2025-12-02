
'use client';

import {
  useState,
  useEffect
} from 'react';
import {
  Button
} from '@/components/ui/button';
import {
  Loader2
} from 'lucide-react';
import {
  useToast
} from '@/hooks/use-toast';
import type {
  GenerateDprInput,
  GenerateDprOutput
} from '@/ai/schemas/dpr';
import {
  generateDprAction
} from '@/app/actions';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';


// This is the new, consolidated DPR Editor page that includes the quiz and the editor.

export default function DPREditorPage() {
  const {
    toast
  } = useToast();

  const [state, setState] = useState({
    currentStep: 1,
    totalSteps: 8,
    formData: {} as Partial<GenerateDprInput>,
    dprData: null as GenerateDprOutput | null,
    images: {} as Record < string, string > ,
    view: 'quiz' as 'quiz' | 'editor' | 'loading',
    activeEditorSection: 'executiveSummary',
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedAnalysis = localStorage.getItem('dprAnalysis');
    if (storedAnalysis) {
        try {
            const analysis = JSON.parse(storedAnalysis) as GenerateInvestmentIdeaAnalysisOutput;
            setState(prev => ({
                ...prev,
                formData: {
                    ...prev.formData,
                    projectName: analysis.title,
                    projectDescription: analysis.summary,
                    targetMarket: analysis.targetAudience,
                    competitiveAdvantage: analysis.roi, // ROI can be part of competitive advantage
                }
            }));
        } catch (e) {
            console.error("Failed to parse DPR analysis from localStorage", e);
        }
    }
  }, []);

  // Handlers for quiz navigation
  const nextStep = () => {
    if (!validateStep(state.currentStep)) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Step',
        description: 'Please fill all required fields before proceeding.',
      });
      return;
    }
    saveStepData(state.currentStep);
    if (state.currentStep < state.totalSteps) {
      setState(prev => ({ ...prev,
        currentStep: prev.currentStep + 1
      }));
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
        generateDPR();
    }
  };

  const prevStep = () => {
    if (state.currentStep > 1) {
      setState(prev => ({ ...prev,
        currentStep: prev.currentStep - 1
      }));
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const validateStep = (stepNum: number) => {
    const stepEl = document.getElementById(`step${stepNum}`);
    if (!stepEl) return false;
    const inputs = stepEl.querySelectorAll('input[required], textarea[required], select[required]');
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (!input.value.trim()) {
            input.style.borderColor = 'var(--error)';
            return false;
        } else {
            input.style.borderColor = '';
        }
    }
    return true;
  };

  const saveStepData = (stepNum: number) => {
    const stepEl = document.getElementById(`step${stepNum}`);
    if (!stepEl) return;
    const inputs = stepEl.querySelectorAll('input, textarea, select');
    const newFormData = { ...state.formData
    };
    inputs.forEach(input => {
      const el = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (el.name) {
        (newFormData as any)[el.name] = el.value;
      }
    });
    setState(prev => ({ ...prev,
      formData: newFormData
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent < HTMLInputElement > , cardId: string) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const card = document.getElementById(cardId);
        if (card) {
          const img = document.createElement('img');
          img.src = result;
          card.innerHTML = '';
          card.appendChild(img);
          card.style.backgroundImage = 'none';
          setState(prev => ({
            ...prev,
            images: { ...prev.images,
              [cardId]: result
            }
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateDPR = async () => {
    saveStepData(state.currentStep);
    setIsLoading(true);
    setState(prev => ({ ...prev,
      view: 'loading'
    }));

    toast({
      title: 'Generating Your DPR...',
      description: 'The AI is building your report. This may take a minute.',
    });

    try {
      const result = await generateDprAction(state.formData as GenerateDprInput);
      if (result.success) {
        setState(prev => ({ ...prev,
          dprData: result.data,
          view: 'editor'
        }));
        toast({
          title: 'DPR Generated!',
          description: 'Your report is ready for review and editing.',
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
      setState(prev => ({ ...prev,
        view: 'quiz'
      })); // Revert to quiz
    } finally {
      setIsLoading(false);
    }
  };


  const renderQuizStep = () => {
    return (
        <div>
            {[...Array(8)].map((_, i) => (
                <div key={i + 1}
                     className={`quiz-step ${state.currentStep === i + 1 ? '' : 'hidden'}`}
                     id={`step${i + 1}`}>
                    <div className="quiz-section">
                        <h3 className="section-title">{`Step ${i + 1} Content`}</h3>
                        <p>Fields for step {i + 1} go here.</p>
                        {i === 0 && (
                            <div className="form-group">
                                <label className="form-label">Project Name <span className="required">*</span></label>
                                <input type="text"
                                       className="form-input"
                                       name="projectName"
                                       placeholder="e.g., Textile Manufacturing Unit"
                                       defaultValue={state.formData.projectName || ''}
                                       required/>
                            </div>
                        )}
                         {i === 0 && (
                            <div className="form-group">
                                <label className="form-label">Project Description <span className="required">*</span></label>
                                <textarea
                                       className="form-input"
                                       name="projectDescription"
                                       placeholder="e.g., A brief summary of your business idea"
                                       defaultValue={state.formData.projectDescription || ''}
                                       rows={5}
                                       required></textarea>
                            </div>
                        )}
                        {i === 5 && (
                             <>
                             <div className="form-group">
                                 <label className="form-label">Target Market <span className="required">*</span></label>
                                 <textarea
                                        className="form-input"
                                        name="targetMarket"
                                        placeholder="e.g., Describe your ideal customer"
                                        defaultValue={state.formData.targetMarket || ''}
                                        rows={5}
                                        required></textarea>
                             </div>
                              <div className="form-group">
                                 <label className="form-label">Competitive Advantage <span className="required">*</span></label>
                                 <textarea
                                        className="form-input"
                                        name="competitiveAdvantage"
                                        placeholder="e.g., What is your unique selling proposition?"
                                        defaultValue={state.formData.competitiveAdvantage || ''}
                                        rows={5}
                                        required></textarea>
                             </div>
                             </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
  };


  const renderEditor = () => {
    if (!state.dprData) return null;

    const sections = [{
      id: 'executiveSummary',
      title: 'Executive Summary',
      content: state.dprData.executiveSummary
    }, {
      id: 'projectIntroduction',
      title: 'Project Description',
      content: state.dprData.projectIntroduction
    }, {
      id: 'promoterDetails',
      title: 'Promoter Details',
      content: state.dprData.promoterDetails
    }, {
      id: 'technicalFeasibility',
      title: 'Technical Details',
      content: state.dprData.technicalFeasibility
    }, {
      id: 'financialProjections',
      title: 'Financial Details',
      content: JSON.stringify(state.dprData.financialProjections, null, 2)
    }, {
      id: 'marketAnalysis',
      title: 'Market Analysis',
      content: state.dprData.marketAnalysis
    }, {
      id: 'swotAnalysis',
      title: 'SWOT Analysis',
      content: state.dprData.swotAnalysis
    },
    {
      id: 'regulatoryCompliance',
      title: 'Regulatory Compliance',
      content: state.dprData.regulatoryCompliance,
    },
    {
      id: 'riskAssessment',
      title: 'Risk Analysis',
      content: state.dprData.riskAssessment
    }, ];

    return (
        <div className="dpr-editor active">
            <div className="editor-sidebar">
                <div className="sidebar-section">
                    <div className="sidebar-title">DPR Sections</div>
                    {sections.map(sec => (
                        <div key={sec.id}
                             className={`sidebar-item ${state.activeEditorSection === sec.id ? 'active' : ''}`}
                             onClick={() => setState(prev => ({...prev, activeEditorSection: sec.id}))}>
                            {sec.title}
                        </div>
                    ))}
                </div>
                <div className="sidebar-section">
                    <div className="sidebar-title">Tools</div>
                    <Button className="toolbar-btn">+ Table</Button>
                    <Button className="toolbar-btn">+ Graph</Button>
                    <Button className="toolbar-btn">⬇️ Download</Button>
                </div>
            </div>
            <div className="editor-panel">
                <div className="editor-main">
                    {sections.map(sec => (
                        <div key={sec.id}
                             className={`dpr-section ${state.activeEditorSection === sec.id ? 'active' : ''}`}
                             id={sec.id}>
                            <h2 className="dpr-section-title">{sec.title}</h2>
                            <div className="edit-field">
                                <div className="edit-field-content"
                                     contentEditable="true"
                                     suppressContentEditableWarning={true}>
                                    {sec.content}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };


  const renderQuiz = () => {
    const progressPercent = (state.currentStep / state.totalSteps) * 100;
    const titles = [
      'Project Information', 'Location & Registration', 'Promoter Details', 'Financial Requirements',
      'Revenue & Profitability', 'Market & Competition', 'Risk Assessment', 'Project Images'
    ];
    const currentTitle = titles[state.currentStep - 1];

    const quizHtml = `
      <div class="quiz-container active" id="quizContainer">
          <div class="quiz-header">
              <div class="quiz-progress">
                  <div class="progress-bar">
                      <div class="progress-fill" style="width: ${progressPercent}%"></div>
                  </div>
                  <div class="progress-text"><span>${state.currentStep}</span> of ${state.totalSteps} Steps</div>
              </div>
              <h2 class="quiz-title">${currentTitle}</h2>
          </div>

          <form id="quizForm">
             ${renderQuizStep()}
          </form>
      </div>`;

    return (
        <div>
            <style>{`
        :root { --primary: #1a7f7e; --primary-dark: #0d5554; --primary-light: #2d9d9c; --accent: #ff6b35; --success: #06d6a0; --warning: #f0ad4e; --error: #e74c3c; --neutral-900: #1a1a1a; --neutral-700: #404040; --neutral-500: #808080; --neutral-300: #d4d4d8; --neutral-200: #e4e4e7; --neutral-100: #f4f4f5; --neutral-50: #fafafa; }
        .quiz-container { background: white; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); padding: 40px; }
        .quiz-header { margin-bottom: 32px; }
        .progress-bar { background: var(--neutral-200); height: 6px; border-radius: 3px; overflow: hidden; }
        .progress-fill { background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%); height: 100%; transition: width 0.3s ease; }
        .progress-text { font-size: 13px; color: var(--neutral-500); margin-top: 8px; font-weight: 500; }
        .quiz-title { font-size: 28px; font-weight: 700; color: var(--neutral-900); margin-bottom: 8px; }
        .section-title { font-size: 18px; font-weight: 600; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid var(--neutral-200); }
        .form-group { margin-bottom: 24px; }
        .form-label { display: block; font-size: 14px; font-weight: 600; color: var(--neutral-700); margin-bottom: 8px; }
        .form-label .required { color: var(--error); }
        .form-input, .form-select, .form-textarea { width: 100%; padding: 12px 14px; border: 1.5px solid var(--neutral-300); border-radius: 8px; font-size: 14px; }
        .dpr-editor.active { display: grid; grid-template-columns: 300px 1fr; gap: 1px; background: var(--neutral-300); height: calc(100vh - 200px); }
        .editor-sidebar { background: var(--neutral-50); padding: 24px; border-right: 1px solid var(--neutral-200); overflow-y: auto; }
        .sidebar-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--neutral-500); margin-bottom: 12px; }
        .sidebar-item { padding: 12px; background: white; border: 1px solid var(--neutral-200); border-radius: 6px; margin-bottom: 8px; cursor: pointer; }
        .sidebar-item.active { background: rgba(26, 127, 126, 0.1); border-color: var(--primary); font-weight: 600; }
        .editor-panel { background: white; overflow-y: auto; }
        .editor-main { padding: 32px 40px; overflow-y: auto; background: white; }
        .dpr-section { display: none; }
        .dpr-section.active { display: block; }
        .dpr-section-title { font-size: 22px; font-weight: 700; color: var(--primary); margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px solid var(--primary); }
        .edit-field-content { background: var(--neutral-50); padding: 12px; border-radius: 6px; border: 1px solid var(--neutral-200); font-size: 14px; min-height: 100px;}
        .hidden { display: none; }
        `}</style>
            <div dangerouslySetInnerHTML={{__html: quizHtml.replace(/<p>.*<\/p>/g, '')}}/>

            <div className="btn-group" style={{display: 'flex', justifyContent: 'space-between', marginTop: '20px'}}>
                <Button variant="secondary"
                        onClick={prevStep}
                        className={state.currentStep > 1 ? '' : 'hidden'}>← Previous
                </Button>
                <Button onClick={nextStep}>
                    {state.currentStep < state.totalSteps ? 'Next →' : '🎯 Generate DPR'}
                </Button>
            </div>
        </div>
    );
  };


  if (state.view === 'loading') {
    return (
        <div className="flex flex-col justify-center items-center h-full text-center">
            <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary"/>
            <h2 className="text-2xl font-semibold">AI is Building Your DPR...</h2>
            <p className="text-muted-foreground">This may take a moment. Please do not refresh.</p>
        </div>
    );
  }

  return state.view === 'quiz' ? renderQuiz() : renderEditor();
}
