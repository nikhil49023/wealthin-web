
'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
  Printer,
  Sparkles,
  Save,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateDprSectionAction } from '@/app/actions';
import { useAuth } from '@/context/auth-provider';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { dprSectionConfig } from '@/lib/dpr-config';
import type { DprQuizData } from '@/ai/schemas/dpr';
import Head from 'next/head';
import Script from 'next/script';

declare const Chart: any; // Make Chart.js globally available
declare const Cropper: any; // Make Cropper.js globally available

type DprSection = {
  key: string;
  title: string;
  icon: React.ElementType;
  description: string;
  prompt: string;
  content: any | null;
  status: 'pending' | 'loading' | 'done' | 'error';
};

const getSectionIdFromKey = (key: string) => `sec-${key.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '')}`;
const getContentIdFromKey = (key: string) => `content-${key.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '')}`;


function DPRReportContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const [quizData, setQuizData] = useState<DprQuizData | null>(null);
  const [sections, setSections] = useState<DprSection[]>(() => 
    dprSectionConfig.map(s => ({ ...s, content: null, status: 'pending' }))
  );
  
  const [generationIndex, setGenerationIndex] = useState(-1);

  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  let cropper: any = null;
  let currentImgWrapper: HTMLElement | null = null;
  const cropperModalRef = useRef<HTMLDivElement>(null);
  const cropperImageRef = useRef<HTMLImageElement>(null);


  const insertAIContent = (sectionKey: string, htmlContent: string) => {
      const contentId = getContentIdFromKey(sectionKey);
      const el = document.getElementById(contentId);
      if (el) {
          el.innerHTML = htmlContent;
          el.style.backgroundColor = '#e0e7ff';
          setTimeout(() => el.style.backgroundColor = 'transparent', 500);
      } else {
          console.error('Section content ID not found:', contentId);
      }
  };

  const generateSection = useCallback(async (index: number) => {
    if (index >= sections.length || !quizData) return;

    const sectionConf = dprSectionConfig[index];
    setSections(prev => prev.map((s, i) => i === index ? { ...s, status: 'loading' } : s));
    
    // Highlight sidebar item
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`a[href="#${getSectionIdFromKey(sectionConf.key)}"]`)?.classList.add('active');

    try {
        const result = await generateDprSectionAction({
            idea: quizData,
            section: sectionConf.key,
            basePrompt: sectionConf.prompt,
        });

        if (result.success && result.data.content) {
            setSections(prev => prev.map((s, i) => i === index ? { ...s, content: result.data.content, status: 'done' } : s));
            insertAIContent(sectionConf.key, result.data.content as string);
            setGenerationIndex(index + 1); // Trigger next section
        } else {
            throw new Error(result.error || `Failed to generate content for ${sectionConf.title}`);
        }
    } catch (err: any) {
         setSections(prev => prev.map((s, i) => i === index ? { ...s, content: err.message, status: 'error' } : s));
         setGenerationIndex(index + 1); // Continue to next section even on error
    }
  }, [quizData, sections.length]);

  useEffect(() => {
    if (generationIndex >= 0 && generationIndex < dprSectionConfig.length) {
      generateSection(generationIndex);
    }
  }, [generationIndex, generateSection]);

  // Load quiz data and start generation on mount
  useEffect(() => {
    const storedQuizData = localStorage.getItem('dprQuizData');
    if (storedQuizData) {
      try {
        const data = JSON.parse(storedQuizData);
        setQuizData(data);
        setGenerationIndex(0); // Start generating the first section
        document.getElementById('content-project-title')!.innerText = data.projectName;
        document.getElementById('content-subtitle')!.innerText = `For: ${data.businessType}`;
        document.getElementById('content-date')!.innerText = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) {
        toast({ variant: 'destructive', description: 'Corrupted quiz data.' });
        router.push('/dpr-editor');
      }
    } else {
      toast({ variant: 'destructive', description: 'No quiz data found.' });
      router.push('/dpr-editor');
    }
  }, [router, toast]);
  
  const handleGenerateFinalDraft = async () => {
    setIsGeneratingDraft(true);
    
    // We need to gather the *current* HTML from the editable divs
    const finalSections = dprSectionConfig.map(section => {
        const el = document.getElementById(getContentIdFromKey(section.key));
        return {
            key: section.key,
            content: el ? el.innerHTML : sections.find(s => s.key === section.key)?.content || '',
        };
    });

    const finalQuizData = {
        ...quizData,
        projectName: document.getElementById('content-project-title')?.innerText || quizData?.projectName,
        logoUrl: document.querySelector('#dpr-document header .img-preview')?.getAttribute('src') || '',
        productImageUrl: document.querySelector('#sec-promoter .img-preview')?.getAttribute('src') || '',
    };
    
    try {
        const response = await fetch('/api/generate-dpr-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sections: finalSections, quizData: finalQuizData }),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'Failed to generate final draft from server.');
        }

        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Draft Generation Failed', description: e.message });
    } finally {
        setIsGeneratingDraft(false);
    }
  };


  // --- All JS from the template is now here in useEffects ---
  useEffect(() => {
    // This is for dynamic functionality after the component mounts
    
    // Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    window.toggleSidebar = () => {
        if (sidebar?.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full');
            overlay?.classList.add('show');
        } else {
            sidebar?.classList.add('-translate-x-full');
            overlay?.classList.remove('show');
        }
    }
    
    window.navClick = (link: HTMLElement) => {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        link.classList.add('active');
        const targetId = link.getAttribute('href')?.substring(1);
        if (targetId) {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (window.innerWidth < 768) {
            window.toggleSidebar();
        }
    }

    // Text Editor
    window.execCmd = (cmd: string, val: string | null = null) => {
        document.execCommand(cmd, false, val);
    }

    // Chart Logic
    let revChart: any, costChart: any;

    const initCharts = () => {
        const ctx1 = (document.getElementById('revenueChart') as HTMLCanvasElement)?.getContext('2d');
        if (ctx1) {
            revChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: ['Yr 1', 'Yr 2', 'Yr 3'],
                    datasets: [{ label: 'Revenue', data: [100000, 150000, 220000], backgroundColor: '#4f46e5' }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        const ctx2 = (document.getElementById('costChart') as HTMLCanvasElement)?.getContext('2d');
        if (ctx2) {
            costChart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Expense', 'Profit'],
                    datasets: [{ data: [80000, 20000], backgroundColor: ['#ef4444', '#10b981'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    window.updateCharts = () => {
        const revInputs = document.querySelectorAll('.rev-input');
        const expInputs = document.querySelectorAll('.exp-input');
        const profits = document.querySelectorAll('.profit-calc');
        if (!revChart || !costChart || revInputs.length === 0) return;

        const revData = Array.from(revInputs).map(i => Number((i as HTMLInputElement).value));
        const expData = Array.from(expInputs).map(i => Number((i as HTMLInputElement).value));

        profits.forEach((p, i) => {
            (p as HTMLElement).innerText = (revData[i] - expData[i]).toLocaleString();
        });
        
        revChart.data.datasets[0].data = revData;
        revChart.update();
        costChart.data.datasets[0].data = [expData[0], revData[0] - expData[0]];
        costChart.update();
    }
    
    initCharts();
    window.updateCharts();


    // Image Cropper Logic
    window.triggerUpload = (el: HTMLElement) => {
      const input = el.closest('.img-wrapper')?.querySelector('.img-input') as HTMLInputElement;
      input?.click();
    };

    window.handleImageUpload = (input: HTMLInputElement) => {
      if (input.files && input.files[0]) {
        const reader = new FileReader();
        currentImgWrapper = input.closest('.img-wrapper');
        reader.onload = (e) => {
            if(e.target?.result) {
                setImageToCrop(e.target.result as string);
            }
        };
        reader.readAsDataURL(input.files[0]);
      }
      input.value = '';
    };
    
    window.closeModal = () => {
      if (cropperModalRef.current) cropperModalRef.current.style.display = 'none';
      if (cropper) cropper.destroy();
      setImageToCrop(null);
    };
    
    window.saveCrop = () => {
      if (!cropper || !currentImgWrapper) return;
      const url = cropper.getCroppedCanvas().toDataURL();
      const preview = currentImgWrapper.querySelector('.img-preview') as HTMLImageElement;
      const holder = currentImgWrapper.querySelector('.img-holder') as HTMLElement;
      
      if(preview) {
        preview.src = url;
        preview.classList.remove('hidden');
      }
      if(holder) holder.classList.add('hidden');
      window.closeModal();
    };

    window.resetImage = (btn: HTMLElement) => {
      const w = btn.closest('.img-wrapper');
      const preview = w?.querySelector('.img-preview') as HTMLImageElement;
      const holder = w?.querySelector('.img-holder') as HTMLElement;
      if (preview) preview.classList.add('hidden');
      if (holder) holder.classList.remove('hidden');
    };
    
    // Add event listeners to inputs
    document.querySelectorAll('.rev-input, .exp-input').forEach(input => {
      input.addEventListener('input', window.updateCharts);
    });

    return () => {
      // Cleanup event listeners
      document.querySelectorAll('.rev-input, .exp-input').forEach(input => {
        input.removeEventListener('input', window.updateCharts);
      });
      if (cropper) {
          cropper.destroy();
      }
    }

  }, []);

  useEffect(() => {
    if (imageToCrop && cropperModalRef.current && cropperImageRef.current) {
        cropperModalRef.current.style.display = 'flex';
        if (cropper) cropper.destroy();
        cropper = new Cropper(cropperImageRef.current, { viewMode: 1 });
    }
  }, [imageToCrop, cropper]);

  if (!quizData) {
    return <div className="flex flex-col justify-center items-center h-full text-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Loading Your Project Data...</h2>
    </div>;
  }
  
  return (
    <>
    <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" />
    </Head>
    <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="afterInteractive" />
    <Script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js" strategy="afterInteractive" />

    {/* Main container with sidebar and content */}
    <div className="flex flex-col h-screen text-gray-800 font-sans">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-20 no-print">
            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                <button className="md:hidden text-gray-500 hover:text-indigo-600 focus:outline-none" onClick={() => window.toggleSidebar()}>
                    <i className="fas fa-bars text-xl"></i>
                </button>
                <Link href="/dpr-editor" className="hidden md:block text-gray-500 hover:text-gray-700">
                    <ArrowLeft/>
                </Link>
                <h1 className="text-lg md:text-xl font-bold text-gray-800 truncate">DPR <span className="hidden sm:inline font-normal text-gray-500 text-sm ml-2">Review & Edit</span></h1>
            </div>
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <Button variant="outline" size="sm">
                    <Sparkles className="mr-2"/>AI Toolkit
                </Button>
                <Button onClick={handleGenerateFinalDraft} disabled={isGeneratingDraft}>
                    {isGeneratingDraft ? <Loader2 className="mr-2 animate-spin"/> : <Printer className="mr-2"/>}
                    <span className="hidden sm:inline">Print / Save PDF</span>
                </Button>
            </div>
        </header>

        {/* Main Workspace */}
        <div className="flex flex-1 overflow-hidden relative">
            <div id="mobile-overlay" className="absolute inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => window.toggleSidebar()}></div>
            
            <aside id="sidebar" className="absolute md:relative z-40 h-full w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 no-print sidebar-container transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out shadow-xl md:shadow-none">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-gray-700">DPR Sections</h2>
                    <button className="md:hidden text-gray-500" onClick={() => window.toggleSidebar()}><i className="fas fa-times"></i></button>
                </div>
                <nav className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {dprSectionConfig.map(sec => (
                         <a key={sec.key} href={`#${getSectionIdFromKey(sec.key)}`} onClick={(e) => { e.preventDefault(); window.navClick(e.currentTarget); }} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                            <sec.icon className="w-5 text-center" /> {sec.title}
                        </a>
                    ))}
                </nav>
            </aside>

            <main className="main-content flex-1 overflow-y-auto bg-gray-100 p-4 md:p-8 flex justify-center custom-scrollbar relative" id="main-scroll">
                <div id="dpr-document" className="a4-paper text-sm md:text-base" dangerouslySetInnerHTML={{__html: `
                    <!-- Header -->
                    <header class="border-b-2 border-indigo-900 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div class="w-full md:w-3/4">
                            <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 uppercase" contenteditable="true" id="content-project-title">DETAILED PROJECT REPORT</h1>
                            <h2 class="text-lg md:text-xl text-indigo-700 font-medium" contenteditable="true" id="content-subtitle">For: New Venture Setup</h2>
                        </div>
                        <div class="w-full md:w-1/4 text-left md:text-right flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end">
                            <div class="img-wrapper relative inline-block">
                                <input type="file" accept="image/*" class="hidden img-input" onchange="window.handleImageUpload(this)">
                                <div class="img-holder w-20 h-20 bg-gray-50 border border-dashed border-indigo-200 rounded flex items-center justify-center text-xs text-indigo-400 cursor-pointer hover:bg-indigo-50" onclick="window.triggerUpload(this)">
                                    [Logo]
                                </div>
                                <img class="img-preview hidden w-20 h-20 object-contain" src="">
                            </div>
                            <p class="text-sm text-gray-500 mt-2" contenteditable="true" id="content-date">Dec 02, 2025</p>
                        </div>
                    </header>

                    <!-- Sections will be populated here -->
                    ${dprSectionConfig.map(sec => `
                        <section id="${getSectionIdFromKey(sec.key)}" class="mb-8 scroll-mt-20">
                            <h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">${sec.title}</h3>
                            <div id="${getContentIdFromKey(sec.key)}" class="prose max-w-none text-justify text-gray-700" contenteditable="true" placeholder="AI is generating content...">
                                <div class="flex items-center gap-2 text-muted-foreground"><span class="animate-spin text-lg">&#9696;</span> <span>Generating...</span></div>
                            </div>
                        </section>
                    `).join('')}
                `}}>
                </div>
            </main>
        </div>

        {/* Cropper Modal */}
        <div id="cropperModal" ref={cropperModalRef}>
            <div className="bg-white p-4 rounded shadow-lg max-w-lg w-full m-4">
                <h3 className="font-bold text-lg mb-4">Crop Image</h3>
                <div className="h-64 bg-gray-200 mb-4 overflow-hidden relative">
                    {imageToCrop && <img id="cropperImage" ref={cropperImageRef} src={imageToCrop} className="max-w-full block"/>}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => window.closeModal()}>Cancel</Button>
                    <Button onClick={() => window.saveCrop()}>Save</Button>
                </div>
            </div>
        </div>
    </div>
    </>
  );
}

// Main component with Suspense
export default function DPRReportPageWithSuspense() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <DPRReportContent />
    </Suspense>
  );
}
