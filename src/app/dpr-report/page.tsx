
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/auth-provider';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const dprSections = [
    { key: 'executiveSummary', title: 'Executive Summary' },
    { key: 'introduction', title: 'Introduction & Background'},
    { key: 'marketAnalysis', title: 'Market Analysis'},
    { key: 'technicalFeasibility', title: 'Technical Feasibility' },
    { key: 'financials', title: 'Financials'},
    { key: 'conclusion', title: 'Conclusion' },
];

function DPRReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [idea, setIdea] = useState<GenerateInvestmentIdeaAnalysisOutput | null>(null);
  const [promoterName, setPromoterName] = useState<string>('');
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // State for AI Toolkit
  const [isToolkitOpen, setIsToolkitOpen] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [sectionToEdit, setSectionToEdit] = useState<string>('');
  const [refinementPrompt, setRefinementPrompt] = useState('');


  useEffect(() => {
    const ideaTitle = searchParams.get('idea');
    const name = searchParams.get('name') || user?.displayName || "[Promoter Name]";
    const storedAnalysis = localStorage.getItem('dprAnalysis');
    
    if (!ideaTitle || !storedAnalysis) {
        toast({ variant: 'destructive', description: "Missing required information. Please start over." });
        router.push('/brainstorm');
        return;
    }

    try {
        const parsedAnalysis: GenerateInvestmentIdeaAnalysisOutput = JSON.parse(storedAnalysis);
        if (parsedAnalysis.title !== ideaTitle) {
            throw new Error("Mismatched analysis data.");
        }
        setIdea(parsedAnalysis);
        setPromoterName(name);
        generateReport(parsedAnalysis, name);
    } catch (e) {
        toast({ variant: 'destructive', description: 'Could not load business analysis data.' });
        router.push('/brainstorm');
    }
  }, [searchParams, router, toast, user]);

  const generateReport = async (idea: GenerateInvestmentIdeaAnalysisOutput, name: string) => {
    setIsGenerating(true);
    try {
        const response = await fetch('/api/generate-dpr-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea: idea, promoterName: name })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to generate DPR HTML from server.");
        }
        const html = await response.text();
        setReportHtml(html);
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Generation Failed", description: e.message });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleRefineSection = async () => {
    if (!sectionToEdit || !refinementPrompt || !iframeRef.current?.contentWindow || !idea || !promoterName) {
      toast({ variant: 'destructive', description: 'Please select a section and enter a prompt.' });
      return;
    }
    setIsRefining(true);

    try {
        const doc = iframeRef.current.contentWindow.document;
        const sectionElement = doc.getElementById(sectionToEdit);
        if (!sectionElement) {
            throw new Error(`Could not find section "${sectionToEdit}" in the document.`);
        }
        const existingContent = sectionElement.innerHTML;
        
        const response = await fetch('/api/refine-dpr-section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                section: sectionToEdit,
                existingContent,
                refinementPrompt,
                idea: idea, // Pass the full idea object
                promoterName: promoterName, // Pass the promoter name
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to refine content.');
        }
        
        const result = await response.json();
        
        // Inject refined content back into the iframe
        sectionElement.innerHTML = result.content;

        // Also save the new content to localStorage inside the iframe
        iframeRef.current.contentWindow.postMessage({
            type: 'saveContent'
        }, '*');

        toast({ title: 'Success', description: `Section "${dprSections.find(s => s.key === sectionToEdit)?.title}" has been refined.` });
        setIsToolkitOpen(false);
        setRefinementPrompt('');
        setSectionToEdit('');
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Refinement Failed', description: e.message });
    } finally {
        setIsRefining(false);
    }
  };
  
  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your Detailed Project Report</h1>
          <p className="text-muted-foreground">Review, edit, and print your AI-generated DPR.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" asChild>
                <Link href="/my-ideas"><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Ideas</Link>
            </Button>
            <Dialog open={isToolkitOpen} onOpenChange={setIsToolkitOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={isGenerating}>
                        <Wand2 className="mr-2 h-4 w-4"/> AI Toolkit
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>AI Section Refinement</DialogTitle>
                        <DialogDescription>
                            Select a section and provide a prompt to have the AI rewrite or improve it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="section-select">Section to Edit</Label>
                            <Select value={sectionToEdit} onValueChange={setSectionToEdit}>
                                <SelectTrigger id="section-select">
                                    <SelectValue placeholder="Select a section..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {dprSections.map(s => (
                                        <SelectItem key={s.key} value={s.key}>{s.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="refinement-prompt">Your Instruction</Label>
                            <Textarea 
                                id="refinement-prompt"
                                value={refinementPrompt}
                                onChange={(e) => setRefinementPrompt(e.target.value)}
                                placeholder="e.g., 'Make this section more formal for a bank loan application.' or 'Expand on the marketing strategy.'"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost" disabled={isRefining}>Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleRefineSection} disabled={isRefining}>
                            {isRefining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Refine with AI
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Button onClick={handlePrint} disabled={isGenerating}>
                <Printer className="mr-2 h-4 w-4"/> Print / Save as PDF
            </Button>
        </div>
      </div>
      
       {isGenerating ? (
        <Card>
          <CardContent className="pt-6 text-center space-y-2 h-96 flex flex-col justify-center items-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="font-semibold text-lg">WealthIn AI is building your DPR...</p>
            <p className="text-sm text-muted-foreground">This may take up to a minute. Please wait.</p>
          </CardContent>
        </Card>
      ) : reportHtml && (
        <>
            <Card>
                <CardContent className="p-2 sm:p-4">
                    <div className="w-full max-w-4xl mx-auto aspect-a4 shadow-lg">
                        <iframe
                            ref={iframeRef}
                            srcDoc={reportHtml}
                            className="w-full h-full border rounded-md"
                            title="DPR Preview"
                        />
                    </div>
                </CardContent>
            </Card>
         </>
      )}

    </div>
  );
}

export default function DPRReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <DPRReportContent />
        </Suspense>
    )
}
