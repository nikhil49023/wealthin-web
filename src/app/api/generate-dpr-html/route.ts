
'use server';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { generateDprSection } from '@/ai/flows/generate-dpr-section';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';

type DprSectionKey = 'executiveSummary' | 'projectIntroduction' | 'promoterDetails' | 'businessModel' | 'marketAnalysis' | 'locationAndSite' | 'technicalFeasibility' | 'implementationSchedule' | 'financialProjections' | 'swotAnalysis' | 'regulatoryCompliance' | 'riskAssessment' | 'annexures';

const getBasePromptForSection = (section: DprSectionKey, idea: GenerateInvestmentIdeaAnalysisOutput, promoterName: string): string => {
  const businessContext = `
Here is the core business profile for context. Use this information to generate the content.
- **Project Title:** ${idea.title}
- **Project Summary:** ${idea.summary}
- **Investment Strategy Context:** ${idea.investmentStrategy}
- **Target Audience Context:** ${idea.targetAudience}
- **ROI Projection Context:** ${idea.roi}
- **Promoter's Name:** ${promoterName}
  `;

  const prompts: Record<DprSectionKey, string> = {
    executiveSummary: `
      You are writing the "Executive Summary" for a Detailed Project Report (DPR) for a bank loan in India.
      - **Objective:** Create a compelling, professional, and concise summary (2-3 paragraphs) that captures the essence of the business proposal.
      - **Content to Include:**
        1.  **Opening:** Start with a strong opening statement introducing the business, "${idea.title}".
        2.  **Core Concept:** Briefly explain the business model, the target market, and the key problem it solves or the opportunity it addresses.
        3.  **Financial Highlights:** Summarize the key financial projections. Mention the total estimated project cost and the projected profitability in the initial years.
        4.  **Promoter's Strength:** Briefly mention the promoter's capability and relevant experience.
        5.  **Closing:** Conclude with a confident statement about the project's viability and its potential for success.
      ${businessContext}
    `,
    projectIntroduction: `
      You are writing the "Project Introduction / Background" section of a DPR.
      - **Objective:** Provide a clear and informative introduction to the project.
      - **Content to Include:**
        1.  **Introduce the Project:** State the name of the project, "${idea.title}".
        2.  **Industry Overview:** Describe the industry the business operates in. Mention current trends and the specific opportunity that has been identified.
        3.  **Mission & Vision:** Clearly state the mission (the 'what' and 'how') and the vision (the long-term aspiration) of the enterprise.
        4.  **Products/Services:** Give a brief overview of the specific products or services that will be offered to customers.
      ${businessContext}
    `,
    promoterDetails: `
      You are writing the "Promoter's Background" section for a DPR.
      - **Objective:** Create a professional profile of the promoter, ${promoterName}, to build credibility.
      - **Content to Include:**
        1.  **Professional Profile:** Detail their educational qualifications (e.g., degree, university).
        2.  **Relevant Experience:** Describe their professional experience, especially highlighting skills and years of experience that are directly relevant to making "${idea.title}" a success.
        3.  **Vision:** Briefly mention their personal vision and commitment to the enterprise.
      ${businessContext}
    `,
    businessModel: `
      You are writing the "Business Model & Operational Plan" section.
      - **Objective:** Explain exactly how the business will operate and generate revenue.
      - **Content to Include:**
        1.  **Core Business Model:** Describe the fundamental model (e.g., B2B manufacturing, Direct-to-Consumer e-commerce, subscription service, etc.).
        2.  **Value Proposition:** Clearly state the unique value the business offers to its customers. What makes it different or better than competitors?
        3.  **Revenue Streams:** Detail the specific ways the business will make money.
        4.  **Operational Activities:** Outline the key day-to-day activities, such as procurement of raw materials, the production process, or the workflow for delivering a service.
      ${businessContext}
    `,
    marketAnalysis: `
      You are writing the "Market Analysis & Marketing Strategy" section.
      - **Objective:** Demonstrate a clear understanding of the market and a practical plan to capture it.
      - **Content to Include:**
        1.  **Industry Overview:** Provide a brief overview of the industry size, growth rate, and key trends in India.
        2.  **Target Market:** Describe the target market in detail, using the context provided: "${idea.targetAudience}". Include demographics, needs, and buying behavior.
        3.  **Competition Analysis:** Identify key competitors (direct and indirect). What is this project's competitive advantage? (e.g., price, quality, service).
        4.  **Marketing & Sales Strategy:** Outline a clear, step-by-step strategy to reach and acquire customers (e.g., digital marketing channels, direct sales team, partnerships, local advertising).
      ${businessContext}
    `,
    locationAndSite: `
      You are writing the "Location and Site Development" section.
      - **Objective:** Justify the choice of location and describe the physical infrastructure.
      - **Content to Include:**
        1.  **Proposed Location:** Specify the proposed location for the business (e.g., city, state).
        2.  **Location Justification:** Explain *why* this location was chosen. Mention advantages like proximity to raw materials, access to the target market, availability of skilled labor, or logistical benefits.
        3.  **Infrastructure:** Describe the proposed infrastructure (e.g., rented facility, owned land, office space) and any required site development or setup.
      ${businessContext}
    `,
    technicalFeasibility: `
      You are writing the "Technical Feasibility" section.
      - **Objective:** Prove that the operational side of the business is well-planned.
      - **Content to Include:**
        1.  **Technology & Machinery:** Detail the key technology and machinery required for operations. Use the context from the "Investment Strategy": "${idea.investmentStrategy}".
        2.  **Process Flow:** Describe the production process or service delivery workflow from start to finish.
        3.  **Supply Chain:** Discuss the plan for sourcing raw materials and the supply chain.
        4.  **Manpower:** Mention the required manpower and their necessary skill sets.
      ${businessContext}
    `,
    implementationSchedule: `
      You are writing the "Implementation Schedule" section.
      - **Objective:** Create a realistic timeline for launching the project.
      - **Critical Output Format:** You MUST present this as a simple HTML table with two columns: "Activity" and "Timeline".
      - **Content to Include:** List key milestones like Loan Disbursement, Site Finalization, Machinery Purchase, Staff Hiring, Marketing Launch, and Commercial Launch. Assign a timeline (e.g., "Week 1-2", "Month 2") to each activity.
      ${businessContext}
    `,
    financialProjections: `
      You are writing the "Financial Feasibility" section. This is the most critical part for a bank loan.
      - **Objective:** Generate comprehensive, realistic financial projections for a small-to-medium enterprise in India.
      - **Critical Output Format:** You MUST generate detailed HTML tables for each of the following financial statements. Use appropriate table headers (<th>) and data cells (<td>).
      - **Content to Include:**
        1.  **Project Cost & Means of Finance:** Create two tables. The first details the project cost (Land, Building, Machinery, etc.). The second details the means of finance (Promoter's Equity, Bank Loan).
        2.  **Projected Profit & Loss (P&L) Account for 5 years:** Create a table showing Revenue, key Expenses, EBITDA, Interest, Depreciation, PBT, and PAT for 5 years.
        3.  **Projected Balance Sheet for 5 years:** Create a table showing key Liabilities (Capital, Loans) and Assets (Fixed Assets, Current Assets) for 5 years.
        4.  **Debt Service Coverage Ratio (DSCR) Calculation for 5 years:** Create a table showing cash accrual, debt obligations, and the final DSCR ratio for each of the 5 years.
        5.  **Break-Even Point (BEP) Analysis:** Create a simple table calculating the BEP.
      - Include a brief introductory paragraph before each table explaining its purpose.
      ${businessContext}
    `,
    swotAnalysis: `
      You are writing the "SWOT Analysis" section.
      - **Objective:** Provide a balanced assessment of the business.
      - **Critical Output Format:** Present the analysis in four distinct sections using <h3> tags for Strengths, Weaknesses, Opportunities, and Threats. Under each heading, use a <ul> with <li> tags for at least 2-3 relevant points.
      - **Content:** The points must be specific to the business idea "${idea.title}". Be realistic and balanced.
      ${businessContext}
    `,
    regulatoryCompliance: `
      You are writing the "Regulatory & Legal Compliance" section.
      - **Objective:** List the necessary legal steps to operate the business in India.
      - **Content to Include:** Create a bulleted list (<ul> and <li>) of key licenses, registrations, and permits. Examples: GST Registration, Udyam Aadhar, Trade License, FSSAI (if applicable), etc. Mention any industry-specific regulations.
      ${businessContext}
    `,
    riskAssessment: `
      You are writing the "Risk Assessment & Mitigation Strategies" section.
      - **Objective:** Identify potential risks and propose practical solutions.
      - **Content to Include:** Identify 3-4 potential risks (e.g., Market Risk, Operational Risk, Financial Risk, Competition Risk). For each risk, use a <h3> tag for the risk title and a <p> tag to explain the proposed mitigation strategy.
      ${businessContext}
    `,
    annexures: `
      You are writing the "Annexures" section.
      - **Objective:** List the supporting documents that would be attached to a real DPR.
      - **Content to Include:** Create a simple bulleted list (<ul> and <li>) of document names. DO NOT ask for the documents themselves. Include items like: Promoter's KYC documents (PAN, Aadhaar), Address Proof, Quotations for Machinery, Business Registration Certificate, etc.
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
                             <p style="font-size: 0.9em; margin-top: 5px;"><strong>Suggestion:</strong> Use the AI Toolkit to try again with a more detailed prompt. For example: "Based on a small-scale organic farm, generate the ${sectionKey}."</p>
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

    