
'use server';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { generateDprSection } from '@/ai/flows/generate-dpr-section';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';
import { cleanAndParseJSON } from '@/lib/cleanJson';


const getDprDataGenerationPrompt = (idea: GenerateInvestmentIdeaAnalysisOutput, promoterName: string): string => `
You are an expert financial analyst preparing a Detailed Project Report (DPR) for a bank loan in India.
Your task is to generate a single, complete, and valid JSON object containing all the financial and descriptive data needed for the report.
Do NOT include any explanatory text, markdown formatting, or anything outside of the single JSON object.

**Project Context:**
- **Idea Title:** "${idea.title}"
- **Idea Summary:** "${idea.summary}"
- **Promoter Name:** "${promoterName}"

**Instructions:**
1.  Generate realistic mock financial data for a small-to-medium scale enterprise in India based on the project context.
2.  Ensure all financial values are represented as numbers, without any formatting (e.g., 500000, not "5,00,000").
3.  The final output MUST be only the JSON object.

**JSON Object to Generate:**
{
  "company_name": "${idea.title}",
  "business_type": "Sole Proprietorship",
  "promoter_name": "${promoterName}",
  "promoter_age": 35,
  "promoter_qualification": "MBA in Marketing",
  "promoter_experience": 5,
  "promoter_cibil": 780,
  "city": "Pune",
  "state": "Maharashtra",
  "industry_sector": "Manufacturing",
  "product_name": "${idea.title}",
  "market_growth_rate": "12",
  "target_audience": "Local B2B clients and retailers",
  "employee_count": 6,
  "cost_land": 0,
  "cost_building": 500000,
  "cost_machinery": 1500000,
  "cost_furniture": 150000,
  "cost_tech": 50000,
  "cost_preops": 100000,
  "cost_contingency": 115000,
  "cost_working_capital": 300000,
  "cost_total": 2715000,
  "finance_own": 678750,
  "finance_loan": 2036250,
  "finance_unsecured": 0,
  "finance_subsidy": 0,
  "finance_total": 2715000,
  "rev_y1": 5000000, "rev_y2": 6000000, "rev_y3": 7500000, "rev_y4": 9000000, "rev_y5": 11000000,
  "rm_y1": 2500000, "rm_y2": 3000000, "rm_y3": 3750000, "rm_y4": 4500000, "rm_y5": 5500000,
  "util_y1": 250000, "util_y2": 300000, "util_y3": 375000, "util_y4": 450000, "util_y5": 550000,
  "sal_y1": 1020000, "sal_y2": 1122000, "sal_y3": 1234200, "sal_y4": 1357620, "sal_y5": 1493382,
  "admin_y1": 500000, "admin_y2": 600000, "admin_y3": 750000, "admin_y4": 900000, "admin_y5": 1100000,
  "exp_y1": 4270000, "exp_y2": 5022000, "exp_y3": 6109200, "exp_y4": 7207620, "exp_y5": 8643382,
  "ebitda_y1": 730000, "ebitda_y2": 978000, "ebitda_y3": 1390800, "ebitda_y4": 1792380, "ebitda_y5": 2356618,
  "int_y1": 203625, "int_y2": 183263, "int_y3": 162900, "int_y4": 142538, "int_y5": 122175,
  "dep_y1": 165000, "dep_y2": 156750, "dep_y3": 148913, "dep_y4": 141467, "dep_y5": 134394,
  "pbt_y1": 361375, "pbt_y2": 637987, "pbt_y3": 1078987, "pbt_y4": 1508375, "pbt_y5": 2099049,
  "tax_y1": 90344, "tax_y2": 159497, "tax_y3": 269747, "tax_y4": 377094, "tax_y5": 524762,
  "pat_y1": 271031, "pat_y2": 478490, "pat_y3": 809240, "pat_y4": 1131281, "pat_y5": 1574287,
  "cap_y1": 949781, "cap_y2": 1428271, "cap_y3": 2237511, "cap_y4": 3368792, "cap_y5": 4943079,
  "res_y1": 271031, "res_y2": 749521, "res_y3": 1558761, "res_y4": 2690042, "res_y5": 4264329,
  "loan_y1": 1629000, "loan_y2": 1221750, "loan_y3": 814500, "loan_y4": 407250, "loan_y5": 0,
  "cl_y1": 500000, "cl_y2": 600000, "cl_y3": 750000, "cl_y4": 900000, "cl_y5": 1100000,
  "tl_y1": 3078781, "tl_y2": 3249021, "tl_y3": 3802011, "tl_y4": 4676042, "tl_y5": 6043079,
  "gfa_y1": 2150000, "gfa_y2": 2150000, "gfa_y3": 2150000, "gfa_y4": 2150000, "gfa_y5": 2150000,
  "acc_dep_y1": 165000, "acc_dep_y2": 321750, "acc_dep_y3": 470663, "acc_dep_y4": 612130, "acc_dep_y5": 746524,
  "nfa_y1": 1985000, "nfa_y2": 1828250, "nfa_y3": 1679337, "nfa_y4": 1537870, "nfa_y5": 1403476,
  "ca_y1": 1093781, "ca_y2": 1420771, "ca_y3": 2122674, "ca_y4": 3138172, "ca_y5": 4639603,
  "ta_y1": 3078781, "ta_y2": 3249021, "ta_y3": 3802011, "ta_y4": 4676042, "ta_y5": 6043079,
  "cash_y1": 638000, "cash_y2": 818000, "cash_y3": 1241000, "cash_y4": 1652000, "cash_y5": 2206000,
  "prin_y1": 407250, "prin_y2": 407250, "prin_y3": 407250, "prin_y4": 407250, "prin_y5": 407250,
  "debt_y1": 610875, "debt_y2": 590513, "debt_y3": 570150, "debt_y4": 549788, "debt_y5": 529425,
  "dscr_y1": "1.04", "dscr_y2": "1.38", "dscr_y3": "2.18", "dscr_y4": "3.01", "dscr_y5": "4.17",
  "ratio_dscr": "2.36",
  "fixed_cost_y3": 1383113,
  "variable_cost_y3": 4125000,
  "ratio_bep": "41"
}
`;

export async function POST(req: Request) {
  try {
    const { idea, promoterName } = await req.json();

    if (!idea || !promoterName) {
      return NextResponse.json(
        { message: 'Idea analysis and promoter name are required' },
        { status: 400 }
      );
    }

    const dataGenerationPrompt = getDprDataGenerationPrompt(idea, promoterName);
    
    // Use the generateDprSection flow, but we'll ask it to generate the full JSON data object
    const result = await generateDprSection({
      idea: idea,
      promoterName: promoterName,
      section: 'fullDprData', // A key to identify this special request
      basePrompt: dataGenerationPrompt,
    });
    
    if (!result.content || typeof result.content !== 'string') {
         throw new Error(`The AI returned an invalid format for the fullDprData section.`);
    }

    const dprData = cleanAndParseJSON(result.content);

    const templatePath = path.join(process.cwd(), 'src', 'app', 'dpr-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');
    
    // Format numbers with commas for display
    const formatNumber = (num: number) => {
        if(typeof num !== 'number') return num;
        return new Intl.NumberFormat('en-IN').format(num);
    };

    // Dynamically replace all placeholders
    for (const key in dprData) {
        const value = dprData[key];
        const formattedValue = typeof value === 'number' ? formatNumber(value) : value;
        template = template.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
            formattedValue
        );
    }
    
    return new NextResponse(template, {
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
