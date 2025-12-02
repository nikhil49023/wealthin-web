
'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Printer,
  AlertTriangle,
  Menu,
  X,
  Bold,
  Italic,
  List,
  Heading3,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { DprQuizData } from '@/ai/schemas/dpr';
import Script from 'next/script';
import Head from 'next/head';
import { generateDprSectionAction } from '@/app/actions';


// This is the main component that renders the interactive DPR editor.
function DPRReportContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [quizData, setQuizData] = useState<DprQuizData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for DOM elements that need direct manipulation by scripts
  const cropperImageRef = useRef<HTMLImageElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);

  // State to manage the image cropper
  const [cropper, setCropper] = useState<any>(null);
  const [currentImageWrapper, setCurrentImageWrapper] = useState<HTMLElement | null>(null);
  const [cropperModalOpen, setCropperModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  // State for charts
  const [charts, setCharts] = useState<{ revChart?: any; costChart?: any }>({});


  // --- Core Logic from user's template, adapted for React ---

  const execCmd = (cmd: string, val: string | null = null) => {
    document.execCommand(cmd, false, val);
  };

  const toggleSidebar = () => {
    const sidebar = sidebarRef.current;
    const overlay = mobileOverlayRef.current;
    if (sidebar && overlay) {
      if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.add('show');
      } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.remove('show');
      }
    }
  };

  const navClick = (link: HTMLAnchorElement) => {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    link.classList.add('active');
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };
  
   const handleImageUpload = (input: HTMLInputElement) => {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      const wrapper = input.closest('.img-wrapper');
      if (wrapper) {
        setCurrentImageWrapper(wrapper as HTMLElement);
      }
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setImageToCrop(result);
          setCropperModalOpen(true);
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
    input.value = ''; // Reset input
  };
  
  const saveCrop = () => {
    if (!cropper || !currentImageWrapper) return;
    const url = cropper.getCroppedCanvas().toDataURL();
    const preview = currentImageWrapper.querySelector('.img-preview') as HTMLImageElement;
    const holder = currentImageWrapper.querySelector('.img-holder') as HTMLElement;
    const controls = currentImageWrapper.querySelector('.img-controls') as HTMLElement;

    if (preview) {
      preview.src = url;
      preview.classList.remove('hidden');
    }
    if (holder) holder.classList.add('hidden');
    if (controls) controls.classList.remove('hidden');

    setCropperModalOpen(false);
  };
  
  const resetImage = (btn: HTMLElement) => {
      const wrapper = btn.closest('.img-wrapper');
      if (!wrapper) return;
      const preview = wrapper.querySelector('.img-preview') as HTMLImageElement;
      const holder = wrapper.querySelector('.img-holder');
      const controls = wrapper.querySelector('.img-controls');

      if(preview) {
        preview.src = '';
        preview.classList.add('hidden');
      }
      if(holder) holder.classList.remove('hidden');
      if(controls) controls.classList.add('hidden');
  };
  
  const triggerUpload = (el: HTMLElement) => {
    const wrapper = el.closest('.img-wrapper');
    if (wrapper) {
      const input = wrapper.querySelector('.img-input') as HTMLInputElement;
      if (input) input.click();
    }
  };

  const updateCharts = () => {
    const revInputs = document.querySelectorAll<HTMLInputElement>('.rev-input');
    const expInputs = document.querySelectorAll<HTMLInputElement>('.exp-input');
    const profits = document.querySelectorAll<HTMLElement>('.profit-calc');
    
    if (!charts.revChart || !charts.costChart) return;

    const revData = Array.from(revInputs).map(i => Number(i.value));
    const expData = Array.from(expInputs).map(i => Number(i.value));
    
    revData.forEach((rev, i) => {
      if (profits[i]) {
        profits[i].innerText = (rev - (expData[i] || 0)).toLocaleString();
      }
    });

    charts.revChart.data.datasets[0].data = revData;
    charts.revChart.update();

    if (revData[0] && expData[0]) {
       charts.costChart.data.datasets[0].data = [expData[0], revData[0] - expData[0]];
       charts.costChart.update();
    }
  };

  useEffect(() => {
    const storedData = localStorage.getItem('dprQuizData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setQuizData(parsedData);
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Error loading data',
          description: 'Could not load your project data. Please start over.',
        });
        router.push('/customize-dpr');
      }
    } else {
        toast({
          variant: 'destructive',
          title: 'No Data Found',
          description: 'Please complete the DPR quiz first.',
        });
        router.push('/customize-dpr');
    }
    setIsLoading(false);
  }, [router, toast]);
  
  useEffect(() => {
    if(cropperModalOpen && imageToCrop && cropperImageRef.current) {
        const cropperInstance = new (window as any).Cropper(cropperImageRef.current, { viewMode: 1 });
        setCropper(cropperInstance);
        return () => cropperInstance.destroy();
    }
  }, [cropperModalOpen, imageToCrop]);


  useEffect(() => {
    if(isLoading) return;

    // Dynamically insert content into placeholders
    if (quizData) {
        (document.getElementById('content-project-title') as HTMLElement).innerText = quizData.projectName;
        (document.getElementById('content-subtitle') as HTMLElement).innerText = `For: ${quizData.businessType}`;
        (document.getElementById('content-date') as HTMLElement).innerText = new Date().toLocaleDateString('en-GB');

        const promoterEl = document.getElementById('content-promoter');
        if (promoterEl) {
            promoterEl.innerHTML = `<p><strong>Name:</strong> ${quizData.promoterName}</p>
                                   <p><strong>Qualification:</strong> ${quizData.education}</p>
                                   <p><strong>Experience:</strong> ${quizData.experience}</p>`;
        }
    }
    
    // Initialize Charts after data is loaded and DOM is ready
    const Chart = (window as any).Chart;
    if(Chart) {
      const ctx1 = (document.getElementById('revenueChart') as HTMLCanvasElement)?.getContext('2d');
      const ctx2 = (document.getElementById('costChart') as HTMLCanvasElement)?.getContext('2d');
      
      if(ctx1 && ctx2){
        const revChart = new Chart(ctx1, { type: 'bar', data: { labels: ['Yr 1', 'Yr 2', 'Yr 3'], datasets: [{ label: 'Revenue', data: [100000, 150000, 220000], backgroundColor: '#4f46e5' }] }, options: { responsive: true, maintainAspectRatio: false } });
        const costChart = new Chart(ctx2, { type: 'doughnut', data: { labels: ['Expense', 'Profit'], datasets: [{ data: [80000, 20000], backgroundColor: ['#ef4444', '#10b981'] }] }, options: { responsive: true, maintainAspectRatio: false } });
        setCharts({ revChart, costChart });
      }
    }

    return () => { // Cleanup charts on unmount
      charts.revChart?.destroy();
      charts.costChart?.destroy();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizData, isLoading]);


  if (isLoading || !quizData) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
     <>
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" />
      </Head>
      <Script src="https://cdn.tailwindcss.com"></Script>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js"></Script>
      <Script src="https://cdn.jsdelivr.net/npm/chart.js"></Script>

    <div className="flex flex-col h-screen text-gray-800 font-sans bg-gray-100 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-20 no-print">
            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                <button className="md:hidden text-gray-500 hover:text-indigo-600 focus:outline-none" onClick={toggleSidebar}>
                    <i className="fas fa-bars text-xl"></i>
                </button>
                <Link href="/my-ideas" className="hidden md:block text-gray-500 hover:text-gray-700">
                    <i className="fas fa-arrow-left"></i>
                </Link>
                <h1 className="text-lg md:text-xl font-bold text-gray-800 truncate">DPR <span className="hidden sm:inline font-normal text-gray-500 text-sm ml-2">Review & Edit</span></h1>
            </div>
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100">
                    <i className="fas fa-magic"></i>AI Toolkit
                </Button>
                <Button variant="outline" size="icon" className="sm:hidden text-indigo-600 bg-indigo-50 rounded-md">
                    <i className="fas fa-magic"></i>
                </Button>
                <Button onClick={() => window.print()} size="sm" className="bg-gray-800 hover:bg-gray-900 text-white shadow flex items-center gap-2">
                    <i className="fas fa-print"></i><span className="hidden sm:inline">Print / Save</span>
                </Button>
            </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
            <div id="mobile-overlay" ref={mobileOverlayRef} className="absolute inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={toggleSidebar}></div>

            <aside id="sidebar" ref={sidebarRef} className="absolute md:relative z-40 h-full w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 no-print sidebar-container transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out shadow-xl md:shadow-none">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-gray-700">DPR Sections</h2>
                    <button className="md:hidden text-gray-500" onClick={toggleSidebar}><i className="fas fa-times"></i></button>
                </div>
                 <nav className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    <a href="#sec-executive" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition active">
                        <i className="fas fa-file-alt w-5 text-center"></i> Executive Summary
                    </a>
                    <a href="#sec-intro" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-building w-5 text-center"></i> Project Introduction
                    </a>
                    <a href="#sec-promoter" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-user-tie w-5 text-center"></i> Promoter Details
                    </a>
                    <a href="#sec-business" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-briefcase w-5 text-center"></i> Business Model
                    </a>
                    <a href="#sec-market" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-chart-line w-5 text-center"></i> Market Analysis
                    </a>
                    <a href="#sec-location" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-map-marker-alt w-5 text-center"></i> Location & Site
                    </a>
                    <a href="#sec-tech" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-cogs w-5 text-center"></i> Technical Feasibility
                    </a>
                    <a href="#sec-schedule" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-calendar-alt w-5 text-center"></i> Implementation Schedule
                    </a>
                    <a href="#sec-finance" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-rupee-sign w-5 text-center"></i> Financial Projections
                    </a>
                    <a href="#sec-swot" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-shield-alt w-5 text-center"></i> SWOT Analysis
                    </a>
                    <a href="#sec-compliance" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-gavel w-5 text-center"></i> Regulatory Compliance
                    </a>
                    <a href="#sec-risk" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-exclamation-triangle w-5 text-center"></i> Risk Assessment
                    </a>
                    <a href="#sec-annexure" onClick={(e) => navClick(e.currentTarget)} className="nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded hover:bg-gray-50 transition">
                        <i className="fas fa-paperclip w-5 text-center"></i> Annexures
                    </a>
                </nav>
            </aside>

            <main className="main-content flex-1 overflow-y-auto bg-gray-100 p-4 md:p-8 flex justify-center custom-scrollbar relative" id="main-scroll">
                <div className="fixed bottom-6 right-6 md:top-24 md:right-8 md:bottom-auto z-30 bg-white p-2 rounded-full md:rounded-lg shadow-xl border border-gray-200 flex md:flex-col gap-2 no-print transition-all">
                    <button onClick={() => execCmd('bold')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded" title="Bold"><i className="fas fa-bold"></i></button>
                    <button onClick={() => execCmd('italic')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded" title="Italic"><i className="fas fa-italic"></i></button>
                    <button onClick={() => execCmd('formatBlock', 'H3')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded font-bold text-xs" title="Heading">H3</button>
                    <button onClick={() => execCmd('insertUnorderedList')} className="p-3 md:p-2 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full md:rounded" title="List"><i className="fas fa-list-ul"></i></button>
                </div>
                
                <div id="dpr-document" className="a4-paper text-sm md:text-base" dangerouslySetInnerHTML={{ __html: `
                    <!-- THIS IS A STATIC TEMPLATE NOW, DYNAMIC CONTENT WILL BE INSERTED BY REACT/SERVER -->
                    <header class="border-b-2 border-indigo-900 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div class="w-full md:w-3/4">
                            <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 uppercase" contenteditable="true" id="content-project-title" placeholder="[PROJECT TITLE]">DETAILED PROJECT REPORT</h1>
                            <h2 class="text-lg md:text-xl text-indigo-700 font-medium" contenteditable="true" id="content-subtitle" placeholder="[Project Subtitle / Purpose]">For: New Venture Setup</h2>
                        </div>
                        <div class="w-full md:w-1/4 text-left md:text-right flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end">
                            <div class="img-wrapper relative inline-block">
                                <input type="file" accept="image/*" class="hidden img-input">
                                <div class="img-holder w-20 h-20 bg-gray-50 border border-dashed border-indigo-200 rounded flex items-center justify-center text-xs text-indigo-400 cursor-pointer hover:bg-indigo-50">
                                    [Logo]
                                </div>
                                <img class="img-preview hidden w-20 h-20 object-contain" src="">
                                <button class="img-controls hidden absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs no-print">×</button>
                            </div>
                            <p class="text-sm text-gray-500 mt-2" contenteditable="true" id="content-date">Dec 02, 2025</p>
                        </div>
                    </header>
                    
                    <section id="sec-executive" class="mb-8 scroll-mt-20">
                        <h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">1. Executive Summary</h3>
                        <div id="content-executive-summary" class="prose max-w-none text-justify text-gray-700" contenteditable="true" placeholder="AI will generate executive summary here..."></div>
                    </section>
                    
                     <section id="sec-intro" class="mb-8 scroll-mt-20">
                        <h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">2. Project Introduction</h3>
                        <div id="content-project-intro" class="prose max-w-none text-gray-700" contenteditable="true" placeholder="AI will generate introduction here..."></div>
                    </section>
                    
                    <section id="sec-promoter" class="mb-8 scroll-mt-20">
                        <h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">3. Promoter Details</h3>
                        <div class="flex flex-col md:flex-row gap-4">
                            <div class="w-full md:w-32 h-48 md:h-32 shrink-0 img-wrapper relative">
                                <input type="file" accept="image/*" class="hidden img-input">
                                <div class="img-holder w-full h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-indigo-400">
                                    <i class="fas fa-camera text-2xl mb-1"></i>
                                    <span class="text-[10px]">Upload</span>
                                </div>
                                <img class="img-preview hidden w-full h-full object-cover rounded" src="">
                                <button class="img-controls hidden absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs no-print">×</button>
                            </div>
                            <div id="content-promoter" class="flex-1 prose max-w-none text-gray-700" contenteditable="true" placeholder="[AI Output: Promoter Bio, Experience, and Qualifications]"></div>
                        </div>
                    </section>
                    
                    <section id="sec-business" class="mb-8 scroll-mt-20"><h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">4. Business Model</h3><div id="content-business-model" class="prose max-w-none text-gray-700" contenteditable="true" placeholder="[AI Output: Business Model Canvas narrative]"></div></section>
                    <section id="sec-market" class="mb-8 scroll-mt-20"><h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">5. Market Analysis</h3><div id="content-market-analysis" class="prose max-w-none text-gray-700" contenteditable="true" placeholder="[AI Output: Market Trends, Growth Rate, and Competitive Landscape]"></div></section>
                    <section id="sec-location" class="mb-8 scroll-mt-20 page-break"><h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">6. Location & Site</h3><div id="content-location" class="prose max-w-none text-gray-700 mb-4" contenteditable="true" placeholder="[AI Output: Site details and location advantages]"></div><div class="h-48 w-full img-wrapper relative"><input type="file" accept="image/*" class="hidden img-input"><div class="img-holder w-full h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-indigo-400"><i class="fas fa-map-marked-alt text-2xl mb-1"></i><span>Upload Site Map</span></div><img class="img-preview hidden w-full h-full object-cover rounded" src=""><button class="img-controls hidden absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs no-print">×</button></div></section>
                    <section id="sec-tech" class="mb-8 scroll-mt-20"><h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">7. Technical Feasibility</h3><div id="content-technical" class="prose max-w-none text-gray-700" contenteditable="true" placeholder="[AI Output: Technology, Machinery, and Manufacturing Process]"></div></section>
                    <section id="sec-schedule" class="mb-8 scroll-mt-20"><h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">8. Implementation Schedule</h3><div id="content-schedule" contenteditable="true" placeholder="[AI Output: Implementation Timeline]"></div></section>
                    <section id="sec-finance" class="mb-8 scroll-mt-20 page-break"><h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">9. Financial Projections</h3><div id="content-financials"></div></section>
                    <section id="sec-swot" class="mb-8 scroll-mt-20"><h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">10. SWOT Analysis</h3><div id="content-swot" class="grid grid-cols-1 md:grid-cols-2 gap-4" contenteditable="true" placeholder="[AI Output: SWOT Analysis Grid]"></div></section>
                    <section id="sec-compliance" class="mb-8 scroll-mt-20"><h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">11. Regulatory Compliance</h3><div id="content-compliance" class="prose max-w-none text-gray-700" contenteditable="true" placeholder="[AI Output: List of required licenses and approvals]"></div></section>
                    <section id="sec-risk" class="mb-8 scroll-mt-20"><h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">12. Risk Assessment</h3><div id="content-risk" class="prose max-w-none text-gray-700" contenteditable="true" placeholder="[AI Output: Risk matrix and mitigation strategies]"></div></section>
                    <section id="sec-annexure" class="mb-8 scroll-mt-20"><h3 class="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">13. Annexures</h3><div id="content-annexure" class="border-2 border-dashed border-gray-300 p-6 rounded text-center text-gray-400 bg-gray-50">Drop supporting documents here (Mock UI)</div></section>
                ` }} />
            </main>
        </div>

        {cropperModalOpen && (
            <div id="cropperModal" style={{ display: 'flex' }}>
                <div className="bg-white p-4 rounded shadow-lg max-w-lg w-full m-4">
                    <h3 className="font-bold text-lg mb-4">Crop Image</h3>
                    <div className="h-64 bg-gray-200 mb-4 overflow-hidden relative">
                         <img id="cropperImage" ref={cropperImageRef} src={imageToCrop || ''} className="max-w-full block"/>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setCropperModalOpen(false)}>Cancel</Button>
                        <Button onClick={saveCrop}>Save</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
    </>
  );
}


// The main page component that wraps the editor in Suspense for client-side rendering
export default function DPRReportPageWithSuspense() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <DPRReportContent />
    </Suspense>
  );
}

    