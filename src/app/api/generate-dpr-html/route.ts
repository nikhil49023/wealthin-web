
'use server';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { generateDprSection } from '@/ai/flows/generate-dpr-section';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';

type DprSectionKey = 'executiveSummary' | 'projectIntroduction' | 'promoterDetails' | 'businessModel' | 'marketAnalysis' | 'locationAndSite' | 'technicalFeasibility' | 'implementationSchedule' | 'financialProjections' | 'swotAnalysis' | 'regulatoryCompliance' | 'riskAssessment' | 'annexures';

const getBasePromptForSection = (section: DprSectionKey, idea: GenerateInvestmentIdeaAnalysisOutput, promoterName: string): string => {
  const businessContext = `
    - **Project Title:** ${idea.title}
    - **Project Summary:** ${idea.summary}
    - **Investment Strategy Context:** ${idea.investmentStrategy}
    - **Target Audience Context:** ${idea.targetAudience}
    - **ROI Projection Context:** ${idea.roi}
    - **Promoter's Name:** ${promoterName}
  `;

  const prompts: Record<DprSectionKey, string> = {
    executiveSummary: `
      Write the "Executive Summary" section.
      - Start with a compelling opening statement about the business, "${idea.title}".
      - Briefly explain the business model, the target market, and the key problem it solves.
      - Summarize the financial projections, highlighting the total project cost and projected profitability.
      - Conclude with a strong statement about the project's viability and the promoter's capability.
      - The entire summary should be about 2-3 paragraphs long.
      ${businessContext}
    `,
    projectIntroduction: `
      Write the "Project Introduction / Background" section.
      - Introduce the project "${idea.title}".
      - Describe the industry it belongs to and the opportunity that has been identified.
      - Explain the mission and vision of the enterprise.
      - Provide a brief overview of the products/services to be offered.
      ${businessContext}
    `,
    promoterDetails: `
      Write the "Promoter's Background" section.
      - Provide a professional profile of the promoter, ${promoterName}.
      - Detail their educational qualifications and relevant professional experience.
      - Emphasize skills and experience that are directly relevant to the success of "${idea.title}".
      - Mention their vision for the enterprise.
      ${businessContext}
    `,
    businessModel: `
      Write the "Business Model & Operational Plan" section.
      - Describe the core business model (e.g., B2B, D2C, subscription, etc.).
      - Detail the revenue streams. How will the business make money?
      - Outline the key operational activities: procurement of raw materials, production process, and delivery of services/products.
      - Describe the value proposition for the customer.
      ${businessContext}
    `,
    marketAnalysis: `
      Write the "Market Analysis & Marketing Strategy" section.
      - Provide an overview of the industry and market size.
      - Describe the target market in detail, using the context provided: "${idea.targetAudience}".
      - Analyze the competition. Who are the key competitors and what is this project's competitive advantage?
      - Outline a clear marketing and sales strategy to acquire customers.
      ${businessContext}
    `,
    locationAndSite: `
      Write the "Location and Site Development" section.
      - Specify the proposed location for the business operations (city, state).
      - Justify the choice of location (e.g., proximity to raw materials, target market, skilled labor).
      - Describe the proposed infrastructure (e.g., rented facility, owned land, office space) and any required site development.
      ${businessContext}
    `,
    technicalFeasibility: `
      Write the "Technical Feasibility" section.
      - Detail the technology and machinery required for the operations. Use the context from "${idea.investmentStrategy}".
      - Describe the production process or service delivery workflow.
      - Discuss the availability of raw materials and the supply chain plan.
      - Mention the required manpower and their skill sets.
      ${businessContext}
    `,
    implementationSchedule: `
      Write the "Implementation Schedule" section.
      - Create a detailed, realistic timeline for project implementation from sanction of loan to commencement of commercial operations.
      - Present this as a simple HTML table with two columns: "Activity" and "Timeline (in weeks/months)".
      - Include key milestones like: Loan Disbursement, Site Finalization, Machinery Purchase, Staff Hiring, Marketing Launch, and Commercial Launch.
      ${businessContext}
    `,
    financialProjections: `
      Write the "Financial Feasibility" section. This is the most critical part.
      - **Crucially, generate detailed HTML tables for each of the following financial statements.**
      - Use realistic, mock financial data for a small-to-medium scale enterprise in India, keeping the project context in mind.
      - **1. Project Cost & Means of Finance Table:** Two columns for particulars and amount.
      - **2. Projected Profit & Loss (P&L) Account for 5 years:** Show revenue, key expenses, EBITDA, PBT, and PAT.
      - **3. Projected Balance Sheet for 5 years:** Show key liabilities and assets.
      - **4. Debt Service Coverage Ratio (DSCR) Calculation for 5 years:** Show cash accrual, debt obligations, and the final DSCR ratio.
      - **5. Break-Even Point (BEP) Analysis:** A simple table showing fixed costs, variable costs, contribution, and the BEP in percentage.
      - Include a brief introductory paragraph before each table explaining its purpose.
      ${businessContext}
    `,
    swotAnalysis: `
      Write the "SWOT Analysis" section.
      - Present the analysis in four distinct sections: Strengths, Weaknesses, Opportunities, and Threats.
      - For each section, provide at least 2-3 relevant bullet points specific to the business idea "${idea.title}".
      - Be realistic and balanced in your assessment.
      ${businessContext}
    `,
    regulatoryCompliance: `
      Write the "Regulatory & Legal Compliance" section.
      - List the key licenses, registrations, and permits required to operate this business in India.
      - Examples: GST Registration, Udyam Aadhar, Trade License, FSSAI (if applicable), etc.
      - Mention compliance with local municipal laws and any industry-specific regulations.
      ${businessContext}
    `,
    riskAssessment: `
      Write the "Risk Assessment & Mitigation Strategies" section.
      - Identify 3-4 potential risks for this business (e.g., market risk, operational risk, financial risk, competition).
      - For each risk, propose a clear and practical mitigation strategy.
      - Present this in a structured way, perhaps using headings for each risk.
      ${businessContext}
    `,
    annexures: `
      Write the "Annexures" section.
      - This section lists the supporting documents that would be attached to a real DPR.
      - Create a bulleted list of documents.
      - Include items like: Promoter's KYC documents (PAN, Aadhaar), Address Proof, Quotations for Machinery, Business Registration Certificate, etc. Do not ask for actual documents.
      ${businessContext}
    `,
  };
  return prompts[section] || `Write a detailed section on ${section}. ${businessContext}`;
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
    results.forEach((result, index) => {
      const sectionKey = sectionsToGenerate[index];
      if (result && 'content' in result && typeof result.content === 'string') {
        htmlContent = htmlContent.replace(`{{${sectionKey}}}`, result.content);
      } else {
        // Handle generation failure for a specific section
        const errorMessage = (result && 'message' in result) ? result.message : "AI generation failed for this section.";
        const errorHtml = `<div style="color: red; border: 1px solid red; padding: 10px; margin: 10px 0;">
                             <strong>Error generating ${sectionKey}:</strong><br/>${errorMessage}
                           </div>`;
        htmlContent = htmlContent.replace(`{{${sectionKey}}}`, errorHtml);
      }
    });

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
