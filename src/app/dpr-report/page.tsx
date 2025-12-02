
'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateDprSectionAction } from '@/app/actions';
import { useAuth } from '@/context/auth-provider';
import { dprSectionConfig } from '@/lib/dpr-config';
import type { DprQuizData } from '@/ai/schemas/dpr';
import Head from 'next/head';
import Script from 'next/script';

declare const Chart: any;
declare const Cropper: any;

function DPRReportContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const [quizData, setQuizData] = useState<DprQuizData | null>(null);
  const [generationIndex, setGenerationIndex] = useState(-1);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const cropperModalRef = useRef<HTMLDivElement>(null);
  const cropperImageRef = useRef<HTMLImageElement>(null);
  let cropper: any = null;
  let currentImgWrapper: HTMLElement | null = null;


  const insertAIContent = (sectionKey: string, htmlContent: any) => {
      const contentId = `content-${sectionKey}`;
      const el = document.getElementById(contentId);
      if (el) {
          if (typeof htmlContent === 'string') {
              el.innerHTML = htmlContent;
          }
          el.style.backgroundColor = '#e0e7ff';
          setTimeout(() => el.style.backgroundColor = 'transparent', 500);
      } else {
          console.error('Section content ID not found:', contentId);
      }
  };

  const generateSection = useCallback(async (index: number) => {
    if (index >= dprSectionConfig.length || !quizData) return;

    const sectionConf = dprSectionConfig[index];
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`a[href="#sec-${sectionConf.key.toLowerCase()}"]`)?.classList.add('active');

    try {
        const result = await generateDprSectionAction({
            idea: quizData,
            section: sectionConf.key,
            basePrompt: sectionConf.prompt,
        });

        if (result.success && result.data.content) {
            insertAIContent(sectionConf.key, result.data.content);
            setGenerationIndex(index + 1); // Trigger next section
        } else {
            throw new Error(result.error || `Failed to generate content for ${sectionConf.title}`);
        }
    } catch (err: any) {
         insertAIContent(sectionConf.key, `<p class="text-red-500">Error: ${err.message}</p>`);
         setGenerationIndex(index + 1); // Continue to next section even on error
    }
  }, [quizData]);

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
  

  useEffect(() => {
    // --- Sidebar Logic ---
    window.toggleSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar?.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full');
            overlay?.classList.add('show');
        } else {
            sidebar?.classList.add('-translate-x-full');
            overlay?.classList.remove('show');
        }
    };

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
    };

    // --- Editor ---
    window.execCmd = (cmd: string, val: string | null = null) => document.execCommand(cmd, false, val);

    // --- Chart Logic ---
    let revChart: any, costChart: any;
    const initCharts = () => {
        if (document.getElementById('revenueChart') && typeof Chart !== 'undefined') {
            const ctx1 = (document.getElementById('revenueChart') as HTMLCanvasElement).getContext('2d');
            revChart = new Chart(ctx1, {
                type: 'bar', data: { labels: ['Yr 1', 'Yr 2', 'Yr 3'], datasets: [{ label: 'Revenue', data: [100000, 150000, 220000], backgroundColor: '#4f46e5' }] }, options: { responsive: true, maintainAspectRatio: false }
            });
            const ctx2 = (document.getElementById('costChart') as HTMLCanvasElement).getContext('2d');
            costChart = new Chart(ctx2, {
                type: 'doughnut', data: { labels: ['Expense', 'Profit'], datasets: [{ data: [80000, 20000], backgroundColor: ['#ef4444', '#10b981'] }] }, options: { responsive: true, maintainAspectRatio: false }
            });
        }
    };
    initCharts();

    window.updateCharts = () => {
        if (!revChart || !costChart) return;
        const revInputs = document.querySelectorAll('.rev-input') as NodeListOf<HTMLInputElement>;
        const expInputs = document.querySelectorAll('.exp-input') as NodeListOf<HTMLInputElement>;
        const profits = document.querySelectorAll('.profit-calc');
        const revData = Array.from(revInputs).map(i => Number(i.value));
        const expData = Array.from(expInputs).map(i => Number(i.value));

        profits.forEach((p, i) => { (p as HTMLElement).innerText = (revData[i] - expData[i]).toLocaleString(); });
        
        revChart.data.datasets[0].data = revData;
        revChart.update();
        costChart.data.datasets[0].data = [expData[0], revData[0] - expData[0]];
        costChart.update();
    };

    // --- Image Cropper Logic ---
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
      const controls = currentImgWrapper.querySelector('.img-controls') as HTMLElement;
      
      if(preview) { preview.src = url; preview.classList.remove('hidden'); }
      if(holder) holder.classList.add('hidden');
      if(controls) controls.classList.remove('hidden');
      window.closeModal();
    };

    window.resetImage = (btn: HTMLElement) => {
      const w = btn.closest('.img-wrapper');
      const preview = w?.querySelector('.img-preview') as HTMLImageElement;
      const holder = w?.querySelector('.img-holder') as HTMLElement;
      const controls = w?.querySelector('.img-controls') as HTMLElement;
      if (preview) { preview.src = ""; preview.classList.add('hidden'); }
      if (holder) holder.classList.remove('hidden');
      if (controls) controls.classList.add('hidden');
    };
    
    document.querySelectorAll('.rev-input, .exp-input').forEach(input => {
      input.addEventListener('input', window.updateCharts);
    });

  }, []);

  useEffect(() => {
    if (imageToCrop && cropperModalRef.current && cropperImageRef.current) {
        cropperModalRef.current.style.display = 'flex';
        cropperImageRef.current.src = imageToCrop;
        if (cropper) cropper.destroy();
        cropper = new Cropper(cropperImageRef.current, { viewMode: 1 });
    }
  }, [imageToCrop]);

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
    <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="lazyOnload" />
    <Script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js" strategy="lazyOnload" />

    <div className="flex flex-col h-screen text-gray-800 font-sans">
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
                 <Button variant="outline" size="sm" className="hidden sm:flex">
                    <i className="fas fa-magic mr-2"></i>AI Toolkit
                </Button>
                <Button variant="outline" size="icon" className="sm:hidden"><i className="fas fa-magic"></i></Button>
                <Button onClick={() => window.print()} size="sm">
                    <i className="fas fa-print mr-2"></i><span className="hidden sm:inline">Print</span>
                </Button>
            </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
            <div id="mobile-overlay" className="absolute inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => window.toggleSidebar()}></div>
            
            <aside id="sidebar" className="absolute md:relative z-40 h-full w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 no-print sidebar-container transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out shadow-xl md:shadow-none">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-gray-700">DPR Sections</h2>
                    <button className="md:hidden text-gray-500" onClick={() => window.toggleSidebar()}><i className="fas fa-times"></i></button>
                </div>
                <nav className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {dprSectionConfig.map(sec => (
                         <a key={sec.key} href={`#sec-${sec.key.toLowerCase()}`} onClick={(e) => { e.preventDefault(); window.navClick(e.currentTarget); }} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                            <sec.icon className="w-5 text-center" /> {sec.title}
                        </a>
                    ))}
                </nav>
            </aside>

            <main className="main-content flex-1 overflow-y-auto bg-gray-100 p-4 md:p-8 flex justify-center custom-scrollbar relative" id="main-scroll">
                <div className="fixed bottom-6 right-6 md:top-24 md:right-8 md:bottom-auto z-30 bg-white p-2 rounded-full md:rounded-lg shadow-xl border border-gray-200 flex md:flex-col gap-2 no-print transition-all">
                    <button onClick={() => window.execCmd('bold')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded" title="Bold"><i className="fas fa-bold"></i></button>
                    <button onClick={() => window.execCmd('italic')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded" title="Italic"><i className="fas fa-italic"></i></button>
                    <button onClick={() => window.execCmd('formatBlock', 'H3')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded font-bold text-xs" title="Heading">H3</button>
                    <button onClick={() => window.execCmd('insertUnorderedList')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded" title="List"><i className="fas fa-list-ul"></i></button>
                </div>

                <div id="dpr-document" className="a4-paper text-sm md:text-base">
                    <header className="border-b-2 border-indigo-900 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div className="w-full md:w-3/4">
                            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 uppercase" contentEditable="true" id="content-project-title">DETAILED PROJECT REPORT</h1>
                            <h2 className="text-lg md:text-xl text-indigo-700 font-medium" contentEditable="true" id="content-subtitle">For: New Venture Setup</h2>
                        </div>
                        <div className="w-full md:w-1/4 text-left md:text-right flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end">
                            <div className="img-wrapper relative inline-block">
                                <input type="file" accept="image/*" className="hidden img-input" onChange={(e) => window.handleImageUpload(e.target)}/>
                                <div className="img-holder w-20 h-20 bg-gray-50 border border-dashed border-indigo-200 rounded flex items-center justify-center text-xs text-indigo-400 cursor-pointer hover:bg-indigo-50" onClick={(e) => window.triggerUpload(e.currentTarget)}>
                                    [Logo]
                                </div>
                                <img className="img-preview hidden w-20 h-20 object-contain" src=""/>
                                <button onClick={(e) => window.resetImage(e.currentTarget)} className="img-controls hidden absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs no-print">×</button>
                            </div>
                            <p className="text-sm text-gray-500 mt-2" contentEditable="true" id="content-date">Dec 02, 2025</p>
                        </div>
                    </header>

                    {dprSectionConfig.map(sec => `
                        <section id="sec-${sec.key.toLowerCase()}" class="mb-8 scroll-mt-20">
                             <h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">${sec.title}</h3>
                             <div id="content-${sec.key}" class="prose max-w-none text-justify text-gray-700" contenteditable="true" placeholder="AI is generating content...">
                                <div class="flex items-center gap-2 text-muted-foreground"><span class="animate-spin text-lg">&#9696;</span> <span>Generating...</span></div>
                            </div>
                        </section>
                    `).join('')}
                </div>
            </main>
        </div>

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

export default function DPRReportPageWithSuspense() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <DPRReportContent />
    </Suspense>
  );
}

    