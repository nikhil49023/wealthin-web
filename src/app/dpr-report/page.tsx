'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bold, Italic, List, Heading3, Printer, Wand2, 
  Menu, X, Upload, ArrowLeft, Check, RotateCw, RotateCcw,
  FileText, Building, User, Briefcase, TrendingUp, MapPin, 
  Settings, Calendar, DollarSign, ShieldAlert, Gavel, AlertTriangle, Paperclip
} from 'lucide-react';
import Script from 'next/script';

// --- Types & Interfaces ---

interface FinancialRecord {
  year: string;
  revenue: number;
  expense: number;
}

interface ImageState {
  [key: string]: string; // id -> base64/url
}

interface CropperState {
  isOpen: boolean;
  imageSrc: string | null;
  targetId: string | null;
}

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
  initialHtml?: string;
}

const EditableBlock: React.FC<EditableProps> = ({ id, placeholder, className, tagName = 'div', initialHtml }) => {
  const Tag = tagName as any;
  
  return (
    <Tag
      id={id}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none border border-dashed border-transparent focus:border-indigo-400 focus:bg-indigo-50 rounded px-1 transition-colors empty:before:content-[attr(placeholder)] empty:before:text-gray-400 empty:before:italic ${className}`}
      placeholder={placeholder}
      dangerouslySetInnerHTML={{ __html: initialHtml || '' }}
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

// --- Main App Component ---

const DprApp: React.FC = () => {
  // --- State ---
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('sec-executive');
  
  const [financials, setFinancials] = useState<FinancialRecord[]>([
    { year: 'Year 1', revenue: 100000, expense: 80000 },
    { year: 'Year 2', revenue: 150000, expense: 100000 },
    { year: 'Year 3', revenue: 220000, expense: 140000 },
  ]);

  const [images, setImages] = useState<ImageState>({});
  
  const [cropperState, setCropperState] = useState<CropperState>({ isOpen: false, imageSrc: null, targetId: null });
  const cropperInstance = useRef<any>(null);
  const cropperImgRef = useRef<HTMLImageElement>(null);

  const revChartRef = useRef<HTMLCanvasElement>(null);
  const costChartRef = useRef<HTMLCanvasElement>(null);
  const revChartInstance = useRef<any>(null);
  const costChartInstance = useRef<any>(null);

  // --- Effects ---

  useEffect(() => {
    if (typeof window !== 'undefined') {
        (window as any).insertAIContent = (id: string, content: string) => {
          const el = document.getElementById(id);
          if (el) {
            el.style.backgroundColor = '#e0e7ff';
            el.innerHTML = content;
            setTimeout(() => { 
                if(el) el.style.backgroundColor = 'transparent' 
            }, 500);
          } else {
            console.warn(`Element with id ${id} not found`);
          }
        };
    }
  }, []);

  useEffect(() => {
    if (!window.Chart || !revChartRef.current || !costChartRef.current) return;

    if (revChartInstance.current) revChartInstance.current.destroy();
    if (costChartInstance.current) costChartInstance.current.destroy();

    revChartInstance.current = new window.Chart(revChartRef.current, {
      type: 'bar',
      data: {
        labels: financials.map(f => f.year),
        datasets: [{
          label: 'Revenue',
          data: financials.map(f => f.revenue),
          backgroundColor: '#4f46e5',
          borderRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    const yr1 = financials[0];
    const profit = yr1.revenue - yr1.expense;
    
    costChartInstance.current = new window.Chart(costChartRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Expense', 'Net Profit'],
        datasets: [{
          data: [yr1.expense, profit],
          backgroundColor: ['#ef4444', '#10b981'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

  }, [financials]);

  useEffect(() => {
    if (cropperState.isOpen && cropperImgRef.current && window.Cropper) {
      if (cropperInstance.current) cropperInstance.current.destroy();
      cropperInstance.current = new window.Cropper(cropperImgRef.current, {
        viewMode: 1,
        autoCropArea: 0.9,
      });
    }
  }, [cropperState.isOpen]);

  // --- Handlers ---

  const handleFinancialChange = (index: number, field: keyof FinancialRecord, value: number) => {
    const newFinancials = [...financials];
    (newFinancials[index] as any)[field] = value;
    setFinancials(newFinancials);
  };

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

  const navItems = [
    { id: 'sec-executive', icon: <FileText size={18} />, label: 'Executive Summary' },
    { id: 'sec-intro', icon: <Building size={18} />, label: 'Project Introduction' },
    { id: 'sec-promoter', icon: <User size={18} />, label: 'Promoter Details' },
    { id: 'sec-business', icon: <Briefcase size={18} />, label: 'Business Model' },
    { id: 'sec-market', icon: <TrendingUp size={18} />, label: 'Market Analysis' },
    { id: 'sec-location', icon: <MapPin size={18} />, label: 'Location & Site' },
    { id: 'sec-tech', icon: <Settings size={18} />, label: 'Technical Feasibility' },
    { id: 'sec-schedule', icon: <Calendar size={18} />, label: 'Implementation Schedule' },
    { id: 'sec-finance', icon: <DollarSign size={18} />, label: 'Financial Projections' },
    { id: 'sec-swot', icon: <ShieldAlert size={18} />, label: 'SWOT Analysis' },
    { id: 'sec-compliance', icon: <Gavel size={18} />, label: 'Regulatory Compliance' },
    { id: 'sec-risk', icon: <AlertTriangle size={18} />, label: 'Risk Assessment' },
    { id: 'sec-annexure', icon: <Paperclip size={18} />, label: 'Annexures' },
  ];

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js" strategy="lazyOnload" />
      <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js" strategy="lazyOnload" />
    
      <div className="flex flex-col h-screen text-gray-800 font-sans bg-gray-100 overflow-hidden">
        
        {/* Header */}
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
                    initialHtml="DETAILED PROJECT REPORT"
                  />
                  <EditableBlock 
                    id="content-subtitle" 
                    tagName="h2" 
                    className="text-lg md:text-xl text-indigo-700 font-medium" 
                    placeholder="[Project Subtitle]" 
                    initialHtml="For: New Venture Setup"
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
                    initialHtml="Dec 02, 2025" 
                  />
                </div>
              </header>

              <section id="sec-executive" className="mb-8 scroll-mt-20">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">1. Executive Summary</h3>
                <EditableBlock 
                  id="content-executive-summary" 
                  className="prose max-w-none text-justify text-gray-700" 
                  placeholder="[AI Output: Executive Summary...]"
                  initialHtml="<p>The proposed project is a manufacturing enterprise, with the primary objective of producing high-quality goods to cater to the domestic market.</p>"
                />
              </section>

              <section id="sec-intro" className="mb-8 scroll-mt-20">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">2. Project Introduction</h3>
                <EditableBlock 
                  id="content-project-intro" 
                  className="prose max-w-none text-gray-700" 
                  placeholder="[AI Output: Introduction...]"
                  initialHtml="<p><strong>Objective:</strong> Setup of a 500 TPA unit.</p><p><strong>Rationale:</strong> Gap in local supply chain.</p>"
                />
              </section>

              <section id="sec-promoter" className="mb-8 scroll-mt-20">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">3. Promoter Details</h3>
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
                    id="content-promoter" 
                    className="flex-1 prose max-w-none text-gray-700" 
                    placeholder="[AI Output: Promoter Bio...]"
                    initialHtml="<p><strong>Name:</strong> [Promoter Name]</p><p><strong>Experience:</strong> [Years] in [Industry]</p>"
                  />
                </div>
              </section>

              <section id="sec-business" className="mb-8 scroll-mt-20">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">4. Business Model</h3>
                <EditableBlock 
                  id="content-business-model" 
                  className="prose max-w-none text-gray-700" 
                  initialHtml="<p>B2B model targeting wholesale distributors.</p>"
                />
              </section>

              <section id="sec-market" className="mb-8 scroll-mt-20">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">5. Market Analysis</h3>
                <EditableBlock 
                  id="content-market-analysis" 
                  className="prose max-w-none text-gray-700" 
                  initialHtml="<p>Market is growing at 15% CAGR.</p>"
                />
              </section>

              <section id="sec-location" className="mb-8 scroll-mt-20 break-before-page">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">6. Location & Site</h3>
                <EditableBlock 
                  id="content-location" 
                  className="prose max-w-none text-gray-700 mb-4" 
                  initialHtml="<p>Located in the industrial belt with access to highway.</p>"
                />
                <ImageUpload 
                  id="location-img"
                  currentImage={images['location-img']}
                  onUpload={initCrop}
                  onDelete={deleteImage}
                  className="w-full h-48"
                  placeholderIcon={<MapPin size={32} />}
                  placeholderText="Upload Site Map"
                />
              </section>

              <section id="sec-tech" className="mb-8 scroll-mt-20">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">7. Technical Feasibility</h3>
                <EditableBlock 
                  id="content-technical" 
                  className="prose max-w-none text-gray-700" 
                  initialHtml="<p>Standardized machinery with semi-automatic control.</p>"
                />
              </section>

              <section id="sec-schedule" className="mb-8 scroll-mt-20">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">8. Implementation Schedule</h3>
                <EditableBlock 
                  id="content-schedule" 
                  className="prose max-w-none text-gray-700" 
                  initialHtml="<ul class='list-disc pl-5'><li>Month 1: Land Acquisition</li><li>Month 3: Civil Works</li><li>Month 6: Production Start</li></ul>"
                />
              </section>

              <section id="sec-finance" className="mb-8 scroll-mt-20 break-before-page">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">9. Financial Projections</h3>
                <p className="text-sm text-gray-500 italic mb-2 no-print">Edit figures below to update charts.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="h-64 border rounded p-2 bg-white min-w-0 relative">
                      <canvas ref={revChartRef} />
                  </div>
                  <div className="h-64 border rounded p-2 bg-white min-w-0 relative">
                      <canvas ref={costChartRef} />
                  </div>
                </div>

                <div className="overflow-x-auto border rounded border-gray-200">
                  <table className="w-full text-sm border-collapse border border-gray-300 min-w-[500px]">
                    <thead className="bg-indigo-50 text-indigo-900">
                      <tr>
                        <th className="border p-2 text-left">Year</th>
                        <th className="border p-2">Revenue ($)</th>
                        <th className="border p-2">Expense ($)</th>
                        <th className="border p-2">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financials.map((row, idx) => (
                        <tr key={idx}>
                          <td className="border p-2 bg-gray-50">{row.year}</td>
                          <td className="border p-0">
                            <input 
                              type="number" 
                              className="w-full p-2 outline-none bg-transparent"
                              value={row.revenue}
                              onChange={(e) => handleFinancialChange(idx, 'revenue', Number(e.target.value))}
                            />
                          </td>
                          <td className="border p-0">
                            <input 
                              type="number" 
                              className="w-full p-2 outline-none bg-transparent"
                              value={row.expense}
                              onChange={(e) => handleFinancialChange(idx, 'expense', Number(e.target.value))}
                            />
                          </td>
                          <td className="border p-2 font-bold text-gray-600">
                            {row.revenue - row.expense}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="sec-swot" className="mb-8 scroll-mt-20">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">10. SWOT Analysis</h3>
                <div id="content-swot" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableBlock id="swot-s" className="border border-gray-200 p-3 rounded bg-green-50 break-words" initialHtml="<strong>Strengths:</strong><br>Experienced Team" />
                  <EditableBlock id="swot-w" className="border border-gray-200 p-3 rounded bg-red-50 break-words" initialHtml="<strong>Weaknesses:</strong><br>Funding limited" />
                  <EditableBlock id="swot-o" className="border border-gray-200 p-3 rounded bg-blue-50 break-words" initialHtml="<strong>Opportunities:</strong><br>Export market" />
                  <EditableBlock id="swot-t" className="border border-gray-200 p-3 rounded bg-yellow-50 break-words" initialHtml="<strong>Threats:</strong><br>Policy changes" />
                </div>
              </section>
              
              <section id="sec-compliance" className="mb-8 scroll-mt-20">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">11. Regulatory Compliance</h3>
                <EditableBlock 
                  id="content-compliance" 
                  className="prose max-w-none text-gray-700" 
                  initialHtml="<p>GST, Udyam Aadhar, and Fire NOC will be obtained.</p>"
                />
              </section>

              <section id="sec-risk" className="mb-8 scroll-mt-20">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">12. Risk Assessment</h3>
                <EditableBlock 
                  id="content-risk" 
                  className="prose max-w-none text-gray-700" 
                  initialHtml="<p>Market risk mitigated by long term contracts.</p>"
                />
              </section>

              <section id="sec-annexure" className="mb-8 scroll-mt-20">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3 mb-3 uppercase">13. Annexures</h3>
                <div className="border-2 border-dashed border-gray-300 p-6 rounded text-center text-gray-400 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                  Drop supporting documents here
                </div>
              </section>

            </div>
          </main>
        </div>

        {cropperState.isOpen && (
          <div className="fixed inset-0 z-[9999] bg-black bg-opacity-80 flex items-center justify-center p-4">
            <div className="bg-white p-4 rounded shadow-lg max-w-lg w-full">
              <h3 className="font-bold text-lg mb-4">Crop Image</h3>
              <div className="h-64 bg-gray-200 mb-4 overflow-hidden relative">
                <img ref={cropperImgRef} src={cropperState.imageSrc!} alt="To Crop" className="max-w-full block" />
              </div>
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <button onClick={() => rotateCrop(-90)} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"><RotateCcw size={16}/></button>
                  <button onClick={() => rotateCrop(90)} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"><RotateCw size={16}/></button>
                </div>
                <div className="flex gap-2">
                  <button onClick={closeCrop} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                  <button onClick={saveCrop} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          @media print {
            @page { size: A4; margin: 0; }
            body { background: white; height: auto; overflow: visible; }
            .no-print { display: none !important; }
            #dpr-document { 
              box-shadow: none !important; margin: 0 !important; width: 210mm !important; max-width: 210mm !important; padding: 20mm !important; 
            }
            .break-before-page { break-before: page; }
            canvas { max-width: 100% !important; }
          }
        `}</style>
      </div>
    </>
  );
};

export default DprApp;
