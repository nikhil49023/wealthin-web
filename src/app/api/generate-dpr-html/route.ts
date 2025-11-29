
'use server';

import {NextResponse} from 'next/server';
import {promises as fs} from 'fs';
import path from 'path';
import {generateDprSection} from '@/ai/flows/generate-dpr-section';
import type {GenerateInvestmentIdeaAnalysisOutput} from '@/ai/schemas/investment-idea-analysis';

// Base prompts for each section, matching the new template's requirements
const dprChapters = [
    { key: 'executiveSummary', title: 'Executive Summary', prompt: 'Generate an Executive Summary for the business. It must include a "Project at a Glance" HTML table with credible, realistic numbers for all financial fields (Project Cost, Promoter\'s Contribution, Bank Loan, DSCR, Employment).' },
    { key: 'introduction', title: 'Introduction & Background', prompt: 'Describe the company background and provide a detailed profile for each promoter, including their qualifications, experience, and net worth.'},
    { key: 'marketAnalysis', title: 'Market Analysis', prompt: 'Analyze the industry, market size, trends, and the target audience. Detail the demand-supply gap and the proposed marketing strategy. Include an image placeholder for a location map by generating the following HTML: `<div contenteditable="false" class="widget-block my-6 p-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer transition-all image-placeholder group" onclick="triggerImageUpload(this)"><div class="placeholder-content"><i data-lucide="map-pin" class="mx-auto mb-3 text-slate-400 group-hover:text-blue-500 transition-colors"></i><p class="text-sm font-bold text-slate-500 group-hover:text-blue-600">Click to Upload Location Map</p><p class="text-xs text-slate-400 mt-1">Supports JPG, PNG (Max 5MB)</p></div></div>`'},
    { key: 'technicalFeasibility', title: 'Technical Feasibility', prompt: 'Detail the manufacturing process in a numbered list. Also provide a "Key Machinery List" HTML table with machine names, fictional suppliers, and realistic costs. Include an image placeholder for the machinery layout by generating the following HTML: `<div contenteditable="false" class="widget-block my-6 p-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer transition-all image-placeholder group" onclick="triggerImageUpload(this)"><div class="placeholder-content"><i data-lucide="settings" class="mx-auto mb-3 text-slate-400 group-hover:text-blue-500 transition-colors"></i><p class="text-sm font-bold text-slate-500 group-hover:text-blue-600">Click to Upload Machinery Layout</p><p class="text-xs text-slate-400 mt-1">Supports JPG, PNG (Max 5MB)</p></div></div>`' },
    { key: 'financials', title: 'Financials', prompt: `
Generate the complete HTML for the financial section of a DPR. This includes the following subsections, each with its own H2 or H3 heading and fully populated HTML table:
1.  **Cost of Project & Means of Finance**: Two separate tables side-by-side.
2.  **Operating Expenses Assessment**: A table for Manpower Requirement.
3.  **Working Capital Assessment**: A detailed table following the Turnover Method.
4.  **Term Loan Repayment Schedule**: A table showing the loan repayment over 5 years.
5.  **Projected Profitability**: An editable table with id="profitTable" for dynamic charts.
6.  **Projected Balance Sheet**: One table showing liabilities and assets for 3 years.
7.  **Financial Ratios**: An editable table with id="ratioTable".
Ensure all numbers are credible and appropriate for a bank loan application.
`},
    { key: 'conclusion', title: 'Conclusion', prompt: 'Write a concluding paragraph summarizing the project\'s viability and formally requesting the bank to sanction the credit facilities.' },
];


export async function POST(req: Request) {
  try {
    const {idea, promoterName} = await req.json() as { idea: GenerateInvestmentIdeaAnalysisOutput, promoterName: string };

    if (!idea || !promoterName) {
      return NextResponse.json(
        {message: 'Idea analysis and promoter name are required'},
        {status: 400}
      );
    }

    const generationPromises = dprChapters.map(chapter =>
      generateDprSection({
        idea,
        promoterName,
        section: chapter.key,
        basePrompt: chapter.prompt,
      })
    );

    const results = await Promise.allSettled(generationPromises);

    const generatedContent: {[key: string]: any} = {};
    results.forEach((result, index) => {
        const chapter = dprChapters[index];
        if (result.status === 'fulfilled') {
            generatedContent[chapter.key] = result.value.content;
        } else {
            console.error(`Failed to generate section "${chapter.key}":`, result.reason);
            generatedContent[chapter.key] = `<div class="p-4 border-l-4 border-destructive bg-destructive/10 text-destructive-foreground">
                <h4 class="font-bold">AI Generation Failed</h4>
                <p class="text-sm">The AI could not generate this section. This can happen if the business idea is too generic.</p>
                <p class="text-sm mt-2"><b>Suggestion:</b> Use the AI Toolkit to try again with a more detailed prompt. For example: "Based on a small-scale organic farm, generate the ${chapter.title}."</p>
            </div>`;
        }
    });

    const templatePath = path.join(process.cwd(), 'src', 'app', 'dpr-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    template = template.replace(/{{projectName}}/g, idea.title || 'Your Project');
    template = template.replace(/{{promoterName}}/g, promoterName);
    template = template.replace('{{executiveSummary}}', `<h2>1. Executive Summary</h2>${generatedContent.executiveSummary || ''}`);
    template = template.replace('{{introduction}}', `<h2>2. Introduction & Background</h2>${generatedContent.introduction || ''}`);
    template = template.replace('{{marketAnalysis}}', `<h2>3. Market Analysis</h2>${generatedContent.marketAnalysis || ''}`);
    template = template.replace('{{technicalFeasibility}}', `<h2>4. Technical Feasibility</h2>${generatedContent.technicalFeasibility || ''}`);
    template = template.replace('{{financials}}', generatedContent.financials || '');
    template = template.replace('{{conclusion}}', `<h2>12. Conclusion</h2>${generatedContent.conclusion || ''}`);

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
