
'use server';

import {NextResponse} from 'next/server';
import {promises as fs} from 'fs';
import path from 'path';
import {generateDprSection} from '@/ai/flows/generate-dpr-section';
import type {GenerateInvestmentIdeaAnalysisOutput} from '@/ai/schemas/investment-idea-analysis';

// Base prompts for each section, matching the new template's requirements
const dprChapters = [
    { key: 'executiveSummary', title: 'Executive Summary', prompt: 'Summarize the project, its business objectives, market potential, and financial highlights. Keep it concise and impactful for a bank loan officer.' },
    { key: 'promoterProfile', title: 'Promoter Profile & Company Overview', prompt: 'Describe the background of the promoter(s), their experience, qualifications, and role in the project. Use the promoter\'s name provided. Include the business objectives.' },
    { key: 'marketAnalysis', title: 'Market Analysis & Strategy', prompt: 'Analyze the industry, market size, trends, and the target audience. Detail the demand-supply gap and the proposed marketing strategy.' },
    { key: 'technicalDetails', title: 'Technical Details & Process Flow', prompt: 'Detail the technology, machinery, and processes required. Describe raw material sourcing and utility requirements (power, water). Create a simplified process flow description.' },
    { key: 'implementationSchedule', title: 'Implementation Schedule', prompt: 'Outline a month-by-month timeline for key project milestones over a 6-month period, from setup to commercial launch. Output as an HTML table.' },
    { key: 'financials', title: 'Financials', prompt: 'Generate a complete set of financial projections. The response must be a single JSON object containing keys for: "projectCost" (array of {particular, amount}), "meansOfFinance" (array of {particular, amount}), "workingCapital" (array of {component, period, total, margin, bankFinance}), "profitability" (array of {particular, year1, year2, year3, year4, year5}), and "balanceSheet" (object with liabilities and assets arrays). Ensure all values are credible numbers.'}
];

// Helper to generate an HTML table from JSON data
function generateHtmlTable(headers: string[], data: any[], numCols: string[] = []): string {
  let table = '<table><thead><tr>';
  headers.forEach(h => table += `<th>${h}</th>`);
  table += '</tr></thead><tbody>';
  data.forEach(row => {
    table += '<tr>';
    headers.forEach(header => {
      const key = header.toLowerCase().replace(/ /g, '');
      const value = row[key] ?? row[header] ?? '';
      const isNum = numCols.includes(header);
      table += `<td class="${isNum ? 'num-col' : ''}">${typeof value === 'number' ? value.toLocaleString('en-IN') : value}</td>`;
    });
    table += '</tr>';
  });
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

    // 1. Generate all sections in parallel
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
      if (result.success) {
        generatedContent[dprChapters[index].key] = result.data.content;
      } else {
        // Fallback for failed section
        generatedContent[dprChapters[index].key] = `<p>Error generating this section.</p>`;
      }
    });

    // 2. Read the HTML template
    const templatePath = path.join(process.cwd(), 'src', 'app', 'dpr-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    // 3. Inject content into the template
    template = template.replace(/{{projectName}}/g, idea.title || 'Your Project');
    template = template.replace(/{{promoterName}}/g, promoterName);
    template = template.replace('{{executiveSummary}}', generatedContent.executiveSummary || '');
    template = template.replace('{{promoterProfile}}', generatedContent.promoterProfile || '');
    template = template.replace('{{marketAnalysis}}', generatedContent.marketAnalysis || '');
    template = template.replace('{{technicalDetails}}', generatedContent.technicalDetails || '');
    template = template.replace('{{implementationSchedule}}', generatedContent.implementationSchedule || '<table><tr><td>Not generated</td></tr></table>');

    // Handle financial data injection
    const financials = generatedContent.financials;
    if (financials && typeof financials === 'object') {
        const projectCostTable = generateHtmlTable(['Particulars', 'Amount ($)'], financials.projectCost, ['Amount ($)']);
        template = template.replace('{{projectCostTable}}', projectCostTable);

        const meansOfFinanceTable = generateHtmlTable(['Particulars', 'Amount ($)'], financials.meansOfFinance, ['Amount ($)']);
        template = template.replace('{{meansOfFinanceTable}}', meansOfFinanceTable);
        
        const workingCapitalTable = generateHtmlTable(['Component', 'Period', 'Total Reqd. ($)', 'Margin (25%)', 'Bank Finance'], financials.workingCapital, ['Total Reqd. ($)', 'Margin (25%)', 'Bank Finance']);
        template = template.replace('{{workingCapitalTable}}', workingCapitalTable);
        
        const profitabilityTable = generateHtmlTable(['Particulars', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'], financials.profitability, ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']);
        template = template.replace('{{profitabilityTable}}', profitabilityTable);

        const liabilitiesTable = generateHtmlTable(['Particulars', 'Year 1', 'Year 2'], financials.balanceSheet.liabilities, ['Year 1', 'Year 2']);
        template = template.replace('{{liabilitiesTable}}', liabilitiesTable);
        
        const assetsTable = generateHtmlTable(['Particulars', 'Year 1', 'Year 2'], financials.balanceSheet.assets, ['Year 1', 'Year 2']);
        template = template.replace('{{assetsTable}}', assetsTable);

    } else {
        // Fallback if financials fail
        template = template.replace(/\{\{.*?Table\}\}/g, '<table><tr><td>Financial data could not be generated.</td></tr></table>');
    }


    // 4. Return the final HTML
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
