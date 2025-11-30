
'use server';

import {NextResponse} from 'next/server';
import {promises as fs} from 'fs';
import path from 'path';
import {generateDprSection} from '@/ai/flows/generate-dpr-section';
import type {GenerateInvestmentIdeaAnalysisOutput} from '@/ai/schemas/investment-idea-analysis';

// Richer, more contextual prompts for each section.
const getDprChapters = (idea: GenerateInvestmentIdeaAnalysisOutput) => [
    { 
        key: 'executiveSummary', 
        title: 'Executive Summary', 
        prompt: `Generate an Executive Summary for the business titled "${idea.title}". The summary should be compelling and concise. It MUST include a "Project at a Glance" HTML table with credible, realistic numbers in Indian Rupees (INR) for all financial fields (Project Cost, Promoter's Contribution, Bank Loan, DSCR, Employment). Base the numbers on the business context: ${idea.summary}.` 
    },
    { 
        key: 'introduction', 
        title: 'Introduction & Background', 
        prompt: `Describe the company background for "${idea.title}". Also provide a detailed promoter profile for the applicant, including their qualifications, experience, and an estimated net worth in INR. The business is about: ${idea.summary}.`
    },
    { 
        key: 'marketAnalysis', 
        title: 'Market Analysis', 
        prompt: `Analyze the industry, market size, and trends for a business focused on "${idea.title}". The target audience is: ${idea.targetAudience}. Detail the demand-supply gap and propose a marketing strategy. Include an image placeholder for a location map by generating the following HTML: <div contenteditable="false" class="widget-block my-6 p-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer transition-all image-placeholder group" onclick="triggerImageUpload(this)"><div class="placeholder-content"><i data-lucide="map-pin" class="mx-auto mb-3 text-slate-400 group-hover:text-blue-500 transition-colors"></i><p class="text-sm font-bold text-slate-500 group-hover:text-blue-600">Click to Upload Location Map</p><p class="text-xs text-slate-400 mt-1">Supports JPG, PNG (Max 5MB)</p></div></div>`
    },
    { 
        key: 'technicalFeasibility', 
        title: 'Technical Feasibility', 
        prompt: `Based on the business idea "${idea.title}", detail the manufacturing/service process in a numbered list. Provide a "Key Machinery List" HTML table with machine names, fictional suppliers, and realistic costs in INR. The investment strategy is: ${idea.investmentStrategy}. Include an image placeholder for the machinery layout by generating the following HTML: <div contenteditable="false" class="widget-block my-6 p-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer transition-all image-placeholder group" onclick="triggerImageUpload(this)"><div class="placeholder-content"><i data-lucide="settings" class="mx-auto mb-3 text-slate-400 group-hover:text-blue-500 transition-colors"></i><p class="text-sm font-bold text-slate-500 group-hover:text-blue-600">Click to Upload Machinery Layout</p><p class="text-xs text-slate-400 mt-1">Supports JPG, PNG (Max 5MB)</p></div></div>` 
    },
    { 
        key: 'financials', 
        title: 'Financials', 
        prompt: `
Generate the complete HTML for the financial section of a DPR for "${idea.title}". The ROI projection is "${idea.roi}". This includes the following subsections, each with its own H2 or H3 heading and fully populated HTML table:
1.  **Cost of Project & Means of Finance**: Two separate tables side-by-side.
2.  **Operating Expenses Assessment**: A table for Manpower Requirement.
3.  **Working Capital Assessment**: A detailed table following the Turnover Method.
4.  **Term Loan Repayment Schedule**: A table showing the loan repayment over 5 years.
5.  **Projected Profitability**: An editable table with id="profitTable" for dynamic charts.
6.  **Projected Balance Sheet**: One table showing liabilities and assets for 3 years.
7.  **Financial Ratios**: An editable table with id="ratioTable".
Ensure all numbers are credible, in Indian Rupees (INR), and appropriate for a bank loan application. Use the '₹' symbol.`
    },
    { 
        key: 'conclusion', 
        title: 'Conclusion', 
        prompt: `Write a concluding paragraph summarizing the project's viability and formally requesting the bank to sanction the credit facilities for the project "${idea.title}".` 
    },
];


export async function POST(req: Request) {
  try {
    const {idea, promoterName} = await req.json() as { idea: GenerateInvestmentIdeaAnalysisOutput, promoterName: string };

    if (!idea) {
      return NextResponse.json(
        {message: 'Idea analysis is required'},
        {status: 400}
      );
    }

    const dprChapters = getDprChapters(idea);

    const generationPromises = dprChapters.map(chapter =>
      generateDprSection({
        idea,
        promoterName: promoterName || '[Promoter Name]',
        section: chapter.key,
        basePrompt: chapter.prompt,
      })
    );

    const results = await Promise.allSettled(generationPromises);

    const generatedContent: {[key: string]: any} = {};
    results.forEach((result, index) => {
        const chapter = dprChapters[index];
        if (result.status === 'fulfilled' && result.value.content) {
            generatedContent[chapter.key] = result.value.content;
        } else {
            const reason = result.status === 'rejected' ? (result.reason as Error).message : 'Empty content';
            console.error(`Failed to generate section "${chapter.key}":`, reason);
            generatedContent[chapter.key] = `<div class="p-4 border-l-4 border-destructive bg-destructive/10 text-destructive-foreground">
                <h4 class="font-bold">AI Generation Failed</h4>
                <p class="text-sm">${reason}</p>
                <p class="text-sm mt-2"><b>Suggestion:</b> Use the AI Toolkit to try again with a more detailed prompt. For example: "Based on a small-scale organic farm, generate the ${chapter.title}."</p>
            </div>`;
        }
    });

    const templatePath = path.join(process.cwd(), 'src', 'app', 'dpr-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    // Create a dynamic storage key based on the project title
    const storageKey = `dpr-content-${idea.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

    template = template.replace(/{{projectName}}/g, idea.title || 'Your Project');
    template = template.replace(/{{promoterName}}/g, promoterName || '[Promoter Name]');
    template = template.replace('{{storageKey}}', storageKey);
    template = template.replace('{{executiveSummary}}', generatedContent.executiveSummary || '');
    template = template.replace('{{introduction}}', generatedContent.introduction || '');
    template = template.replace('{{marketAnalysis}}', generatedContent.marketAnalysis || '');
    template = template.replace('{{technicalFeasibility}}', generatedContent.technicalFeasibility || '');
    template = template.replace('{{financials}}', generatedContent.financials || '');
    template = template.replace('{{conclusion}}', generatedContent.conclusion || '');

    return new NextResponse(template, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error: any) {
    console.error('Error in DPR HTML generation API:', error);
    return NextResponse.json(
      {message: `Failed to generate DPR HTML: ${error.message}`},
      {status: 500}
    );
  }
}
