
'use server';

import { generateBudgetReport } from '@/ai/flows/generate-budget-report';
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Helper to generate an HTML table from JSON data
function generateHtmlTable(headers: string[], data: any[]): string {
    if (!data || data.length === 0) return '<p>No data available.</p>';
    let table = '<table class="w-full text-sm text-left"><thead class="bg-gray-50 text-gray-500 font-medium"><tr>';
    headers.forEach(h => table += `<th class="px-6 py-3">${h}</th>`);
    table += '</tr></thead><tbody class="divide-y divide-gray-50">';
    data.forEach(row => {
        table += '<tr>';
        Object.values(row).forEach((val: any, index) => {
            const isNum = typeof val === 'number';
            const cellClass = `px-6 py-4 ${isNum ? 'num-cell' : ''}`;
            let cellValue = isNum ? formatCurrency(val) : val;
            if (headers[index].toLowerCase() === 'status') {
                cellValue = `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">${val}</span>`;
            }
             table += `<td class="${cellClass}">${cellValue}</td>`;
        });
        table += '</tr>';
    });
    table += '</tbody></table>';
    return table;
}

export async function POST(req: Request) {
  try {
    const { transactions } = await req.json();
    if (!transactions) {
      return NextResponse.json(
        { message: 'Transactions are required' },
        { status: 400 }
      );
    }
    
    // 1. Get structured data from AI
    const result = await generateBudgetReport({ transactions });

    // 2. Read the HTML template
    const templatePath = path.join(process.cwd(), 'src', 'app', 'budget-report-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    // 3. Inject data into template placeholders
    template = template.replace('{{aiSummary}}', result.summary);
    template = template.replace('{{totalIncome}}', formatCurrency(result.overallBreakdown.totalIncome));
    template = template.replace('{{totalExpenses}}', formatCurrency(result.overallBreakdown.totalExpenses));
    template = template.replace('{{savings}}', formatCurrency(result.overallBreakdown.savings));
    template = template.replace('{{savingsRate}}', `${result.overallBreakdown.savingsRate}%`);
    
    const expenseTableHtml = generateHtmlTable(['Category', 'Amount'], result.expenseBreakdown);
    template = template.replace('{{expenseTable}}', expenseTableHtml);

    // 4. Return the final HTML
    return new NextResponse(template, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error: any) {
    console.error('Error in budget report API:', error);
    return NextResponse.json(
      { message: `Failed to generate budget report: ${error.message}` },
      { status: 500 }
    );
  }
}
