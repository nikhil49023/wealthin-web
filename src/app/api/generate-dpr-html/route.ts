
'use server';

import {NextResponse} from 'next/server';
import {promises as fs} from 'fs';
import path from 'path';
import {generateDprSection} from '@/ai/flows/generate-dpr-section';
import type {GenerateInvestmentIdeaAnalysisOutput} from '@/ai/schemas/investment-idea-analysis';

// Base prompts for each section, matching the new template's requirements
const dprChapters = [
    { key: 'executiveSummary', title: 'Executive Summary', prompt: 'Summarize the project, its business objectives, market potential, and financial highlights. Include a "Project at a Glance" table in HTML with credible, realistic numbers for all financial fields (Project Cost, Promoter\'s Contribution, Bank Loan, DSCR, Employment).' },
    { key: 'introduction', title: 'Introduction & Background', prompt: 'Describe the company background and provide a detailed profile for each promoter, including their qualifications, experience, and net worth.'},
    { key: 'marketAnalysis', title: 'Market Analysis', prompt: 'Analyze the industry, market size, trends, and the target audience. Detail the demand-supply gap and the proposed marketing strategy.' },
    { key: 'technicalFeasibility', title: 'Technical Feasibility', prompt: 'Detail the manufacturing process in a numbered list. Also provide an HTML table for a "Key Machinery List" with machine names, fictional suppliers, and realistic costs.' },
    { key: 'financials', title: 'Financials', prompt: `
Generate a complete set of financial projections for a new manufacturing business. The response MUST BE A SINGLE VALID JSON OBJECT and nothing else.
The JSON object must contain these top-level keys: "costOfProject", "meansOfFinance", "manpower", "workingCapital", "repaymentSchedule", "profitability", "balanceSheet", and "financialRatios".

Populate each key with an array of objects containing realistic financial data based on the business profile. Follow this exact schema:
{
  "costOfProject": [{ "particulars": "(string)", "amount": "(number)" }],
  "meansOfFinance": [{ "source": "(string)", "amount": "(number)" }],
  "manpower": [{ "category": "(string)", "no": "(number)", "salarymo": "(number)", "annualcost": "(number)" }],
  "workingCapital": [{ "particulars": "(string)", "holdingperiod": "(string)", "year1level": "(number)", "margin25": "(number)", "bankfinance": "(number)" }],
  "repaymentSchedule": [{ "year": "(string)", "openingbal": "(number)", "repayment": "(number)", "interest": "(number)", "closingbal": "(number)" }],
  "profitability": [{ "particulars": "(string)", "year1": "(number)", "year2": "(number)", "year3": "(number)", "year4": "(number)", "year5": "(number)" }],
  "balanceSheet": {
      "liabilities": [{ "particulars": "(string)", "year1": "(number)", "year2": "(number)", "year3": "(number)" }],
      "assets": [{ "particulars": "(string)", "year1": "(number)", "year2": "(number)", "year3": "(number)" }]
  },
  "financialRatios": [{ "ratio": "(string)", "year1": "(number)", "year2": "(number)", "year3": "(number)", "benchmark": "(string)" }]
}
Ensure all numbers are credible and appropriate for a bank loan application.
`},
    { key: 'conclusion', title: 'Conclusion', prompt: 'Write a concluding paragraph summarizing the project\'s viability and formally requesting the bank to sanction the credit facilities.' },
];


function generateHtmlTable(headers: string[], data: any[], numCols: string[] = [], totalRow?: any): string {
    if (!data || data.length === 0) return '<table><tr><td>No data available.</td></tr></table>';

    let table = '<table><thead><tr>';
    headers.forEach(h => table += `<th class="${numCols.includes(h) ? 'num' : ''}">${h}</th>`);
    table += '</tr></thead><tbody>';

    data.forEach(row => {
        table += '<tr>';
        headers.forEach(header => {
            const key = header.toLowerCase().replace(/ /g, '').replace(/[^\w\s]/gi, '');
            let value = row[key] ?? row[header.toLowerCase()] ?? '';
            if(typeof value === 'number') {
                value = value.toLocaleString('en-IN');
            }
            table += `<td class="${numCols.includes(header) ? 'num' : ''}">${value}</td>`;
        });
        table += '</tr>';
    });

    if (totalRow) {
        table += '<tr class="total">';
        headers.forEach(header => {
             const key = header.toLowerCase().replace(/ /g, '').replace(/[^\w\s]/gi, '');
             let value = totalRow[key] ?? totalRow[header.toLowerCase()] ?? '';
             if(typeof value === 'number') {
                value = value.toLocaleString('en-IN');
            }
            table += `<td class="${numCols.includes(header) ? 'num' : ''}">${value}</td>`;
        });
        table += '</tr>';
    }

    table += '</tbody></table>';
    return table;
}

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

    const results = await Promise.all(generationPromises);

    const generatedContent: {[key: string]: any} = {};
    results.forEach((result, index) => {
        generatedContent[dprChapters[index].key] = result.content;
    });

    const templatePath = path.join(process.cwd(), 'src', 'app', 'dpr-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    template = template.replace(/{{projectName}}/g, idea.title || 'Your Project');
    template = template.replace(/{{promoterName}}/g, promoterName);
    template = template.replace('{{executiveSummary}}', generatedContent.executiveSummary || '');
    template = template.replace('{{introduction}}', generatedContent.introduction || '');
    template = template.replace('{{marketAnalysis}}', generatedContent.marketAnalysis || '');
    template = template.replace('{{technicalFeasibility}}', generatedContent.technicalFeasibility || '');
    template = template.replace('{{conclusion}}', generatedContent.conclusion || '');

    const financials = generatedContent.financials;
    if (financials && typeof financials === 'object') {
        const costTable = generateHtmlTable(['Particulars', 'Amount'], financials.costOfProject, ['Amount'], financials.costOfProject.find((r:any) => r.particulars.toLowerCase() === 'total'));
        template = template.replace('{{costOfProjectTable}}', costTable);
        
        const financeTable = generateHtmlTable(['Source', 'Amount'], financials.meansOfFinance, ['Amount'], financials.meansOfFinance.find((r:any) => r.source.toLowerCase() === 'total'));
        template = template.replace('{{meansOfFinanceTable}}', financeTable);

        const manpowerTable = generateHtmlTable(['Category', 'No.', 'Salary/Mo', 'Annual Cost'], financials.manpower, ['No.', 'Salary/Mo', 'Annual Cost'], financials.manpower.find((r:any) => r.category.toLowerCase() === 'total salaries'));
        template = template.replace('{{manpowerTable}}', manpowerTable);

        const capitalTable = generateHtmlTable(['Particulars', 'Holding Period', 'Year 1 Level', 'Margin (25%)', 'Bank Finance'], financials.workingCapital, ['Year 1 Level', 'Margin (25%)', 'Bank Finance']);
        template = template.replace('{{workingCapitalTable}}', capitalTable);
        
        const repaymentTable = generateHtmlTable(['Year', 'Opening Bal', 'Repayment', 'Interest', 'Closing Bal'], financials.repaymentSchedule, ['Opening Bal', 'Repayment', 'Interest', 'Closing Bal']);
        template = template.replace('{{repaymentScheduleTable}}', repaymentTable);
        
        const profitTable = generateHtmlTable(['Particulars', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'], financials.profitability, ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']);
        template = template.replace('{{profitabilityTable}}', profitTable);

        if (financials.balanceSheet) {
            const liabilitiesTable = generateHtmlTable(['Particulars', 'Year 1', 'Year 2', 'Year 3'], financials.balanceSheet.liabilities || [], ['Year 1', 'Year 2', 'Year 3']);
            template = template.replace('{{liabilitiesTable}}', liabilitiesTable);
            
            const assetsTable = generateHtmlTable(['Particulars', 'Year 1', 'Year 2', 'Year 3'], financials.balanceSheet.assets || [], ['Year 1', 'Year 2', 'Year 3']);
            template = template.replace('{{assetsTable}}', assetsTable);
        }
        
        const ratiosTable = generateHtmlTable(['Ratio', 'Year 1', 'Year 2', 'Year 3', 'Benchmark'], financials.financialRatios, ['Year 1', 'Year 2', 'Year 3']);
        template = template.replace('{{financialRatiosTable}}', ratiosTable);
        
        const profitChartData = JSON.stringify(financials.profitability.filter((d: any) => d.particulars === 'Total Income' || d.particulars === 'Net Profit (PAT)'));
        template = template.replace('{{profitChartData}}', profitChartData);

        const dscrChartData = JSON.stringify(financials.financialRatios.find((r: any) => r.ratio === 'DSCR'));
        template = template.replace('{{dscrChartData}}', dscrChartData);
    }


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
