
'use server';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { generateDprSection } from '@/ai/flows/generate-dpr-section';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';

type DprSectionKey = 'executiveSummary' | 'projectIntroduction' | 'promoterDetails' | 'businessModel' | 'marketAnalysis' | 'locationAndSite' | 'technicalFeasibility' | 'implementationSchedule' | 'financialProjections' | 'swotAnalysis' | 'regulatoryCompliance' | 'riskAssessment' | 'annexures';

const getBasePromptForSection = (section: DprSectionKey, idea: GenerateInvestmentIdeaAnalysisOutput, promoterName: string): string => {
  
  // Create smaller, targeted context strings
  const projectContext = `**Project:** "${idea.title}" by ${promoterName}. **Summary:** ${idea.summary}`;
  const marketContext = `**Target Audience:** ${idea.targetAudience}`;
  const financialContext = `**Investment:** ${idea.investmentStrategy}. **ROI:** ${idea.roi}`;

  const prompts: Record<DprSectionKey, string> = {
    executiveSummary: `
      Write a compelling 2-3 paragraph "Executive Summary" for a DPR.
      - **Content:** Introduce the business, explain the core concept, summarize key financials (project cost, projected profit), and state the project's viability.
      - ${projectContext}
      - ${financialContext}
    `,
    projectIntroduction: `
      Write the "Project Introduction / Background" section.
      - **Content:** Describe the industry and opportunity. State the project's mission and vision. Briefly list the products/services.
      - ${projectContext}
    `,
    promoterDetails: `
      Write the "Promoter's Background" for ${promoterName}.
      - **Content:** Detail their professional profile, relevant experience, and commitment to the project.
      - ${projectContext}
    `,
    businessModel: `
      Write the "Business Model & Operational Plan".
      - **Content:** Explain the core model (e.g., B2B, D2C), revenue streams, and key day-to-day operational activities.
      - ${projectContext}
    `,
    marketAnalysis: `
      Write the "Market Analysis & Marketing Strategy".
      - **Content:** Provide an industry overview, describe the target market in detail, analyze competitors, and outline a marketing/sales strategy.
      - ${projectContext}
      - ${marketContext}
    `,
    locationAndSite: `
      Write the "Location and Site Development" section.
      - **Content:** Specify the proposed location and justify the choice (e.g., access to market, logistics). Describe the physical infrastructure.
      - ${projectContext}
    `,
    technicalFeasibility: `
      Write the "Technical Feasibility" section.
      - **Content:** Detail the technology/machinery required, describe the process flow, and discuss the supply chain and manpower needs.
      - ${projectContext}
      - ${financialContext}
    `,
    implementationSchedule: `
      Write the "Implementation Schedule" section.
      - **Output Format:** MUST be a simple HTML table with two columns: "Activity" and "Timeline".
      - **Content:** List key milestones (e.g., Loan Disbursement, Site Finalization, Machinery Purchase, Staff Hiring, Commercial Launch) and assign a timeline to each.
      - ${projectContext}
    `,
    financialProjections: `
      Write the "Financial Feasibility" section for a bank loan.
      - **Output Format:** MUST generate detailed HTML tables for each statement.
      - **Content:**
        1.  **Project Cost & Means of Finance:** Two tables detailing project costs and how it will be financed (Equity, Loan).
        2.  **Projected P&L Account (5 years):** Table showing Revenue, Expenses, EBITDA, PBT, PAT.
        3.  **Projected Balance Sheet (5 years):** Table showing Liabilities and Assets.
        4.  **DSCR Calculation (5 years):** Table showing cash accrual, debt, and the DSCR ratio.
        5.  **Break-Even Point (BEP) Analysis:** A simple table calculating the BEP.
      - Include a brief introductory paragraph before each table.
      - ${projectContext}
      - ${financialContext}
    `,
    swotAnalysis: `
      Write the "SWOT Analysis" section.
      - **Output Format:** Use <h3> tags for Strengths, Weaknesses, Opportunities, and Threats. Under each, use a <ul> with <li> tags for 2-3 points.
      - **Content:** Points must be specific to the business idea and be balanced.
      - ${projectContext}
    `,
    regulatoryCompliance: `
      Write the "Regulatory & Legal Compliance" section.
      - **Content:** Create a bulleted list (<ul> and <li>) of key Indian licenses and registrations needed (e.g., GST, Udyam Aadhar, Trade License, FSSAI if applicable).
      - ${projectContext}
    `,
    riskAssessment: `
      Write the "Risk Assessment & Mitigation Strategies" section.
      - **Content:** Identify 3-4 potential risks (Market, Operational, Financial). For each, use an <h3> for the risk title and a <p> to explain the mitigation strategy.
      - ${projectContext}
    `,
    annexures: `
      Write the "Annexures" section.
      - **Content:** Create a simple bulleted list (<ul> and <li>) of supporting document names that would be attached to a real DPR (e.g., Promoter's KYC, Machinery Quotations).
      - ${projectContext}
    `,
  };
  return prompts[section] || `Write a detailed section on ${section}. ${projectContext}`;
};

export async function POST(req: Request) {
  try {
    const { idea, promoterName, dprType } = await req.json();

    if (!idea || !promoterName) {
      return NextResponse.json(
        { message: 'Idea analysis and promoter name are required' },
        { status: 400 }
      );
    }
    
    // 1. Read the base HTML template
    const templatePath = path.join(process.cwd(), 'src', 'app', 'dpr-template.html');
    let htmlContent = await fs.readFile(templatePath, 'utf-8');

    // 2. Generate content for all sections in parallel
    const sectionsToGenerate: DprSectionKey[] = [
      'executiveSummary', 'projectIntroduction', 'promoterDetails', 'businessModel', 'marketAnalysis',
      'locationAndSite', 'technicalFeasibility', 'implementationSchedule', 'financialProjections',
      'swotAnalysis', 'regulatoryCompliance', 'riskAssessment', 'annexures'
    ];

    const generationPromises = sectionsToGenerate.map(section => 
      generateDprSection({
        idea: idea,
        promoterName: promoterName,
        section: section,
        basePrompt: getBasePromptForSection(section, idea, promoterName),
      }).catch(e => ({ error: true, section, message: e.message })) // Catch errors individually
    );

    const results = await Promise.all(generationPromises);

    // 3. Inject generated content into the template
    let hasErrors = false;
    results.forEach((result, index) => {
      const sectionKey = sectionsToGenerate[index];
      if (result && 'content' in result && typeof result.content === 'string') {
        htmlContent = htmlContent.replace(`{{${sectionKey}}}`, result.content);
      } else {
        // Handle generation failure for a specific section
        hasErrors = true;
        const errorMessage = (result && 'message' in result) ? result.message : "AI generation failed for this section.";
        const errorHtml = `<div style="color: red; border: 1px solid red; padding: 10px; margin: 10px 0; background-color: #fff5f5;">
                             <strong style="font-size: 1.1em;">Error generating ${sectionKey}:</strong><br/>${errorMessage}
                             <p style="font-size: 0.9em; margin-top: 5px;"><strong>Suggestion:</strong> The prompt for this section may have been too long or the AI service is temporarily unavailable. Please try again.</p>
                           </div>`;
        htmlContent = htmlContent.replace(`{{${sectionKey}}}`, errorHtml);
      }
    });

    // Replace the title in the header as well
    htmlContent = htmlContent.replace(`{{dprTitle}}`, idea.title || "Project Report");


    // 4. Return the final HTML
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error: any) {
    console.error('Error in DPR HTML generation API:', error);
    return NextResponse.json(
      { message: `Failed to generate DPR: ${error.message}` },
      { status: 500 }
    );
  }
}
