
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { 
  Bold, Italic, List, Printer, Wand2, 
  Menu, X, Upload, ArrowLeft,
  FileText, Building, User, Briefcase, TrendingUp, MapPin, 
  Settings, Calendar, DollarSign, ShieldAlert, Gavel, AlertTriangle, Paperclip,
  RotateCcw, RotateCw, Loader2
} from 'lucide-react';
import { dprSectionConfig } from '@/lib/dpr-config';
import type { DprQuizData } from '@/ai/schemas/dpr';
import { generateDprSectionAction } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { FinancialProjectionsBarChart, ProjectCostPieChart } from '@/components/wealthin/dpr-charts';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';


// --- External Libraries (Simulated Imports for Single File) ---
declare global {
  interface Window {
    Chart: any;
    Cropper: any;
  }
}

// --- Types & Interfaces ---

interface ImageState {
  [key: string]: string; // id -> base64/url
}

interface CropperState {
  isOpen: boolean;
  imageSrc: string | null;
  targetId: string | null;
}

type SectionContent = {
    [key: string]: {
        content: any; // Can be string (HTML) or object (financial data)
        status: 'pending' | 'loading' | 'done' | 'error';
    };
};


// --- Components ---

// 1. Rich Text Toolbar
const RichTextToolbar: React.FC = () => {
  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
  };

  return (
    <div className="fixed bottom-6 right-6 md:top-24 md:right-8 md:bottom-auto z-30 bg-white p-2 rounded-full md:rounded-lg shadow-xl border border-gray-200 flex md:flex-col gap-2 no-print transition-all">
      <button onClick={() => exec('bold')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded" title="Bold">
        <Bold size={18} />
      </button>
      <button onClick={() => exec('italic')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded" title="Italic">
        <Italic size={18} />
      </button>
      <button onClick={() => exec('formatBlock', 'H3')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded font-bold text-xs flex items-center justify-center" title="Heading 3">
        H3
      </button>
      <button onClick={() => exec('insertUnorderedList')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded" title="List">
        <List size={18} />
      </button>
    </div>
  );
};

// 2. Editable Content Block
interface EditableProps {
  id: string;
  placeholder?: string;
  className?: string;
  tagName?: 'div' | 'h1' | 'h2' | 'p' | 'ul' | 'strong';
  html: string;
}

const EditableBlock: React.FC<EditableProps> = ({ id, placeholder, className, tagName = 'div', html }) => {
  const Tag = tagName as any;
  
  return (
    <Tag
      id={id}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none border border-dashed border-transparent focus:border-indigo-400 focus:bg-indigo-50 rounded px-1 transition-colors empty:before:content-[attr(placeholder)] empty:before:text-gray-400 empty:before:italic ${className}`}
      placeholder={placeholder}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// 3. Image Upload Wrapper
interface ImageUploadProps {
  id: string;
  currentImage: string | undefined;
  onUpload: (id: string, file: File) => void;
  onDelete: (id: string) => void;
  className?: string;
  placeholderIcon?: React.ReactNode;
  placeholderText?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ id, currentImage, onUpload, onDelete, className, placeholderIcon, placeholderText }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => inputRef.current?.click();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onUpload(id, e.target.files[0]);
    }
    e.target.value = ''; // Reset
  };

  return (
    <div className={`relative group ${className}`}>
      <input 
        type="file" 
        ref={inputRef} 
        onChange={handleChange} 
        accept="image/*" 
        className="hidden" 
      />
      
      {!currentImage ? (
        <div 
          onClick={handleClick}
          className="w-full h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-500 transition-colors"
        >
          {placeholderIcon || <Upload size={24} />}
          <span className="text-xs mt-1">{placeholderText || 'Upload'}</span>
        </div>
      ) : (
        <>
          <img src={currentImage} alt="Uploaded" className="w-full h-full object-cover rounded" />
          <button 
            onClick={() => onDelete(id)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity no-print"
          >
            <X size={12} />
          </button>
        </>
      )}
    </div>
  );
};


function DPRReportContent() {
  const { toast } = useToast();
  // This state will hold the mapped data from idea analysis
  const [reportInput, setReportInput] = useState<any>(null);

  const initialContentState = dprSectionConfig.reduce((acc, section) => {
    acc[section.key] = { content: `<p>Loading content for ${section.title}...</p>`, status: 'loading' };
    return acc;
  }, {} as SectionContent);

  const [sectionContents, setSectionContents] = useState<SectionContent>(initialContentState);

  // --- State ---
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('sec-executiveSummary');
  
  const [images, setImages] = useState<ImageState>({});
  
  const [cropperState, setCropperState] = useState<CropperState>({ isOpen: false, imageSrc: null, targetId: null });
  const cropperInstance = useRef<any>(null);
  const cropperImageRef = useRef<HTMLImageElement>(null);

  // Map Idea Analysis to DprQuizData structure
  useEffect(() => {
    const storedAnalysis = localStorage.getItem('dprAnalysis');
    if (storedAnalysis) {
        try {
            const analysis: GenerateInvestmentIdeaAnalysisOutput = JSON.parse(storedAnalysis);
            // Map the analysis data to the structure the DPR generation expects.
            // This acts as our "quiz data".
            const mappedData = {
                projectName: analysis.title,
                businessDescription: analysis.summary,
                targetMarket: analysis.targetAudience,
                // Pass the whole analysis object to have access to all fields in prompts
                fullAnalysis: analysis,
            };
            setReportInput(mappedData);
        } catch(e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load project analysis data.'});
        }
    }
  }, [toast]);

  // Generate sections sequentially
  useEffect(() => {
    if (!reportInput) return;

    const generateAllSections = async () => {
      for (const section of dprSectionConfig) {
        try {
          const result = await generateDprSectionAction({
            idea: reportInput, // Use the mapped data
            section: section.key,
            basePrompt: section.prompt,
          });

          if (result.success) {
            setSectionContents(prev => ({
              ...prev,
              [section.key]: { content: result.data.content, status: 'done' }
            }));
          } else {
            throw new Error(result.error);
          }
        } catch (error: any) {
          console.error(`Error generating ${section.key}:`, error);
          setSectionContents(prev => ({
            ...prev,
            [section.key]: { content: `<p class="text-red-500">Error: ${error.message}</p>`, status: 'error' }
          }));
        }
      }
    };

    generateAllSections();
  }, [reportInput]);


  // Initialize Cropper
  useEffect(() => {
    if (cropperState.isOpen && cropperImageRef.current && window.Cropper) {
      if (cropperInstance.current) cropperInstance.current.destroy();
      cropperInstance.current = new window.Cropper(cropperImageRef.current, {
        viewMode: 1,
        autoCropArea: 0.9,
      });
    }
  }, [cropperState.isOpen]);


  const initCrop = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCropperState({
        isOpen: true,
        imageSrc: e.target?.result as string,
        targetId: id
      });
    };
    reader.readAsDataURL(file);
  };

  const saveCrop = () => {
    if (cropperInstance.current && cropperState.targetId) {
      const canvas = cropperInstance.current.getCroppedCanvas();
      const croppedUrl = canvas.toDataURL();
      setImages(prev => ({ ...prev, [cropperState.targetId!]: croppedUrl }));
      closeCrop();
    }
  };

  const closeCrop = () => {
    setCropperState({ isOpen: false, imageSrc: null, targetId: null });
    if (cropperInstance.current) {
      cropperInstance.current.destroy();
      cropperInstance.current = null;
    }
  };

  const rotateCrop = (deg: number) => {
    cropperInstance.current?.rotate(deg);
  };

  const deleteImage = (id: string) => {
    const newImages = { ...images };
    delete newImages[id];
    setImages(newImages);
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const navItems = dprSectionConfig.map(section => ({
      id: `sec-${section.key}`,
      icon: React.createElement(section.icon, { size: 18 }),
      label: section.title,
  }));
  

  const financialData = sectionContents.financialProjections?.content;

  return (
    <div className="flex flex-col h-screen text-gray-800 font-sans bg-gray-100 overflow-hidden">
      
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-20 no-print">
        <div className="flex items-center gap-3">
          <button className="md:hidden text-gray-500 hover:text-indigo-600" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <button className="hidden md:block text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-gray-800 truncate">
            DPR <span className="hidden sm:inline font-normal text-gray-500 text-sm ml-2">Review & Edit</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden sm:flex px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md font-medium text-sm transition items-center">
            <Wand2 size={16} className="mr-2" /> AI Toolkit
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md font-medium text-sm shadow flex items-center">
            <Printer size={16} className="mr-2" /> <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        
        {sidebarOpen && (
          <div className="absolute inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`absolute md:relative z-40 h-full w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 no-print transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} shadow-xl md:shadow-none`}>
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-700">DPR Sections</h2>
            <button className="md:hidden text-gray-500" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded transition-colors ${
                  activeSection === item.id 
                    ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-8 flex justify-center relative">
          <RichTextToolbar />

          <div id="dpr-document" className="bg-white w-full max-w-[210mm] min-h-[297mm] p-6 md:p-[20mm] shadow-lg mb-8 mx-auto print:w-[210mm] print:p-[20mm] print:shadow-none print:m-0">
            
            <header className="border-b-2 border-indigo-900 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div className="w-full md:w-3/4">
                <EditableBlock 
                  id="content-project-title" 
                  tagName="h1" 
                  className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 uppercase" 
                  placeholder="[PROJECT TITLE]" 
                  html={reportInput?.projectName || 'DETAILED PROJECT REPORT'}
                />
                <EditableBlock 
                  id="content-subtitle" 
                  tagName="h2" 
                  className="text-lg md:text-xl text-indigo-700 font-medium" 
                  placeholder="[Project Subtitle]" 
                  html={reportInput?.businessDescription || 'For: New Venture Setup'}
                />
              </div>
              <div className="w-full md:w-1/4 flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end">
                <ImageUpload 
                  id="header-logo"
                  currentImage={images['header-logo']}
                  onUpload={initCrop}
                  onDelete={deleteImage}
                  className="w-20 h-20"
                  placeholderText="[Logo]"
                />
                <EditableBlock 
                  id="content-date" 
                  tagName="p" 
                  className="text-sm text-gray-500 mt-2 text-right" 
                  html={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                />
              </div>
            </header>

            {dprSectionConfig.map((section) => (
                <section key={section.key} id={`sec-${section.key}`} className="mb-8 scroll-mt-20">
                    <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">{dprSectionConfig.findIndex(s => s.key === section.key) + 1}. {section.title}</h3>
                    
                    {sectionContents[section.key]?.status === 'loading' ? (
                        <div className="flex items-center gap-2 text-muted-foreground p-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Generating...</span>
                        </div>
                    ) : section.key === 'financialProjections' && financialData ? (
                        <div className="space-y-6">
                            <EditableBlock id="financial-summary" className="prose max-w-none text-gray-700" html={financialData.summaryText} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-bold mb-2">Cost Breakdown</h4>
                                    <div className="h-64 border rounded p-2 bg-white min-w-0 relative">
                                        <ProjectCostPieChart data={financialData.costBreakdown} />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold mb-2">Yearly Projections</h4>
                                    <div className="h-64 border rounded p-2 bg-white min-w-0 relative">
                                        <FinancialProjectionsBarChart data={financialData.yearlyProjections} />
                                    </div>
                                </div>
                            </div>
                             <EditableBlock id="financial-analysis" className="prose max-w-none text-gray-700" html={`
                                ${financialData.projectCost}
                                ${financialData.meansOfFinance}
                                ${financialData.profitabilityAnalysis}
                                ${financialData.cashFlowStatement}
                                ${financialData.loanRepaymentSchedule}
                                ${financialData.breakEvenAnalysis}
                            `} />
                        </div>
                    ) : section.key === 'promoterDetails' ? (
                         <div className="flex flex-col md:flex-row gap-4">
                            <div className="w-full md:w-32 shrink-0">
                                <ImageUpload 
                                    id="promoter-img"
                                    currentImage={images['promoter-img']}
                                    onUpload={initCrop}
                                    onDelete={deleteImage}
                                    className="w-full h-48 md:h-32"
                                    placeholderIcon={<User size={32} />}
                                    placeholderText="Upload Photo"
                                />
                            </div>
                            <EditableBlock 
                                id={`content-${section.key}`}
                                className="flex-1 prose max-w-none text-gray-700"
                                placeholder={`[AI is generating ${section.title.toLowerCase()}...]`}
                                html={sectionContents[section.key]?.content || ''}
                            />
                        </div>
                    ) : (
                        <EditableBlock 
                            id={`content-${section.key}`}
                            className="prose max-w-none text-gray-700"
                            placeholder={`[AI is generating ${section.title.toLowerCase()}...]`}
                            html={sectionContents[section.key]?.content || ''}
                        />
                    )}
                </section>
            ))}

          </div>
        </main>
      </div>

      {cropperState.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-80 flex items-center justify-center p-4">
          <div className="bg-white p-4 rounded shadow-lg max-w-lg w-full">
            <h3 className="font-bold text-lg mb-4">Crop Image</h3>
            <div className="h-64 bg-gray-200 mb-4 overflow-hidden relative">
               <img ref={cropperImageRef} src={cropperState.imageSrc || ''} alt="To Crop" className="max-w-full block" />
            </div>
            <div className="flex justify-between">
              <div className="flex gap-2">
                 <Button variant="ghost" size="icon" onClick={() => rotateCrop(-90)}><RotateCcw size={16}/></Button>
                 <Button variant="ghost" size="icon" onClick={() => rotateCrop(90)}><RotateCw size={16}/></Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={closeCrop}>Cancel</Button>
                <Button onClick={saveCrop}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; height: auto; overflow: visible; }
          .no-print { display: none !important; }
          #dpr-document { 
             box-shadow: none !important; margin: 0 !important; width: 210mm !important; max-width: 210mm !important; padding: 20mm !important; 
          }
          canvas { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
};


export default function DPRReportPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <DPRReportContent />
        </Suspense>
    )
}
