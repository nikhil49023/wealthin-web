
'use server';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { generateDprSection } from '@/ai/flows/generate-dpr-section';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';

// This new prompt instructs the AI to return a single JSON object
// with all the data needed for the new template.
const getDprDataGenerationPrompt = (idea: GenerateInvestmentIdeaAnalysisOutput, promoterName: string) => {
  return `
Based on the following business idea, generate a detailed JSON object for a Detailed Project Report (DPR).
The user is applying for a bank loan in India. All financial figures must be realistic, in Indian Rupees (INR), and be numbers only.

**Business Idea:**
- Title: "${idea.title}"
- Summary: "${idea.summary}"
- Investment Strategy: "${idea.investmentStrategy}"
- Target Audience: "${idea.targetAudience}"
- ROI Projection: "${idea.roi}"

**Promoter Name:** ${promoterName}

**Required JSON Output Structure:**
{
  "company_name": "string",
  "business_type": "string (e.g., Sole Proprietorship)",
  "city": "string",
  "state": "string",
  "industry_sector": "string",
  "product_name": "string",
  "target_audience": "string",
  "market_growth_rate": "number",
  "employee_count": "number",
  "promoter_age": "number",
  "promoter_qualification": "string",
  "promoter_experience": "number",
  "promoter_cibil": "number (between 700-850)",
  "cost_land": "number",
  "cost_building": "number",
  "cost_machinery": "number",
  "cost_furniture": "number",
  "cost_tech": "number",
  "cost_preops": "number",
  "cost_contingency": "number",
  "cost_working_capital": "number",
  "cost_total": "number (sum of all costs)",
  "finance_own": "number",
  "finance_loan": "number",
  "finance_unsecured": "number",
  "finance_subsidy": "number",
  "finance_total": "number (sum of all finances)",
  "rev_y1": "number", "rev_y2": "number", "rev_y3": "number", "rev_y4": "number", "rev_y5": "number",
  "rm_y1": "number", "rm_y2": "number", "rm_y3": "number", "rm_y4": "number", "rm_y5": "number",
  "util_y1": "number", "util_y2": "number", "util_y3": "number", "util_y4": "number", "util_y5": "number",
  "sal_y1": "number", "sal_y2": "number", "sal_y3": "number", "sal_y4": "number", "sal_y5": "number",
  "admin_y1": "number", "admin_y2": "number", "admin_y3": "number", "admin_y4": "number", "admin_y5": "number",
  "exp_y1": "number", "exp_y2": "number", "exp_y3": "number", "exp_y4": "number", "exp_y5": "number",
  "ebitda_y1": "number", "ebitda_y2": "number", "ebitda_y3": "number", "ebitda_y4": "number", "ebitda_y5": "number",
  "int_y1": "number", "int_y2": "number", "int_y3": "number", "int_y4": "number", "int_y5": "number",
  "dep_y1": "number", "dep_y2": "number", "dep_y3": "number", "dep_y4": "number", "dep_y5": "number",
  "pbt_y1": "number", "pbt_y2": "number", "pbt_y3": "number", "pbt_y4": "number", "pbt_y5": "number",
  "tax_y1": "number", "tax_y2": "number", "tax_y3": "number", "tax_y4": "number", "tax_y5": "number",
  "pat_y1": "number", "pat_y2": "number", "pat_y3": "number", "pat_y4": "number", "pat_y5": "number",
  "cap_y1": "number", "cap_y2": "number", "cap_y3": "number", "cap_y4": "number", "cap_y5": "number",
  "res_y1": "number", "res_y2": "number", "res_y3": "number", "res_y4": "number", "res_y5": "number",
  "loan_y1": "number", "loan_y2": "number", "loan_y3": "number", "loan_y4": "number", "loan_y5": "number",
  "cl_y1": "number", "cl_y2": "number", "cl_y3": "number", "cl_y4": "number", "cl_y5": "number",
  "tl_y1": "number", "tl_y2": "number", "tl_y3": "number", "tl_y4": "number", "tl_y5": "number",
  "gfa_y1": "number", "gfa_y2": "number", "gfa_y3": "number", "gfa_y4": "number", "gfa_y5": "number",
  "acc_dep_y1": "number", "acc_dep_y2": "number", "acc_dep_y3": "number", "acc_dep_y4": "number", "acc_dep_y5": "number",
  "nfa_y1": "number", "nfa_y2": "number", "nfa_y3": "number", "nfa_y4": "number", "nfa_y5": "number",
  "ca_y1": "number", "ca_y2": "number", "ca_y3": "number", "ca_y4": "number", "ca_y5": "number",
  "ta_y1": "number", "ta_y2": "number", "ta_y3": "number", "ta_y4": "number", "ta_y5": "number",
  "cash_y1": "number", "cash_y2": "number", "cash_y3": "number", "cash_y4": "number", "cash_y5": "number",
  "prin_y1": "number", "prin_y2": "number", "prin_y3": "number", "prin_y4": "number", "prin_y5": "number",
  "debt_y1": "number", "debt_y2": "number", "debt_y3": "number", "debt_y4": "number", "debt_y5": "number",
  "dscr_y1": "number", "dscr_y2": "number", "dscr_y3": "number", "dscr_y4": "number", "dscr_y5": "number",
  "ratio_dscr": "number (average of all DSCR years)",
  "ratio_bep": "number (percentage)",
  "fixed_cost_y3": "number",
  "variable_cost_y3": "number"
}
`;
};

// Helper function to format numbers as Indian currency strings
const formatCurrency = (value: number) => {
  if (typeof value !== 'number') return '0';
  return value.toLocaleString('en-IN');
};

export async function POST(req: Request) {
  try {
    const { idea, promoterName } = await req.json() as { idea: GenerateInvestmentIdeaAnalysisOutput, promoterName: string };

    if (!idea) {
      return NextResponse.json({ message: 'Idea analysis is required' }, { status: 400 });
    }

    // 1. Generate the structured JSON data from the AI
    const dprPrompt = getDprDataGenerationPrompt(idea, promoterName || '[Promoter Name]');
    
    // We reuse the 'generateDprSection' flow, but with a different prompt that asks for JSON.
    const generationResult = await generateDprSection({
      idea,
      promoterName: promoterName || '[Promoter Name]',
      section: 'fullDprData',
      basePrompt: dprPrompt,
    });
    
    // The content from the AI should be a JSON string.
    const generatedData = JSON.parse(generationResult.content as string);

    // 2. Read the new HTML template
    const templatePath = path.join(process.cwd(), 'src', 'app', 'dpr-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    // 3. Replace all placeholders in the template with the generated data
    // The keys in generatedData should match the placeholders in the HTML
    for (const key in generatedData) {
      const placeholder = `{{${key}}}`;
      let value = generatedData[key];
      
      // Format numeric values to currency strings where appropriate
      if (typeof value === 'number' && key.startsWith('cost_') || key.startsWith('finance_') || key.startsWith('rev_') || key.startsWith('exp_') || key.startsWith('ebitda_') || key.startsWith('pbt_') || key.startsWith('pat_') || key.startsWith('fixed_cost_')) {
        value = formatCurrency(value);
      }
      
      template = template.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    // Replace any remaining placeholders for safety
    template = template.replace(/\{\{.*?\}\}/g, 'N/A');

    // 4. Return the populated HTML
    return new NextResponse(template, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error: any) {
    console.error('Error in DPR HTML generation API:', error);
    // Return a user-friendly error response
    return NextResponse.json(
      { message: `Failed to generate DPR: ${error.message}` },
      { status: 500 }
    );
  }
}
