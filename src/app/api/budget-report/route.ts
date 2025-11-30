
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

export async function POST(req: Request) {
  try {
    const { transactions, budgets, savingsGoals } = await req.json();

    if (!transactions) {
      return NextResponse.json(
        { message: 'Transactions are required' },
        { status: 400 }
      );
    }
    
    // 1. Get structured data from AI
    const result = await generateBudgetReport({ transactions, budgets, savingsGoals });

    // 2. Read the HTML template
    const templatePath = path.join(process.cwd(), 'src', 'app', 'budget-report-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    // 3. Inject data into template placeholders
    template = template.replace('{{totalIncome}}', formatCurrency(result.overallBreakdown.totalIncome));
    template = template.replace('{{totalExpenses}}', formatCurrency(result.overallBreakdown.totalExpenses));
    template = template.replace('{{savings}}', formatCurrency(result.overallBreakdown.savings));
    template = template.replace('{{savingsRate}}', `${result.overallBreakdown.savingsRate}%`);
    
    // Inject AI Content
    template = template.replace('{{aiSummary}}', result.summary);
    template = template.replace('{{aiSuggestions}}', result.suggestions.map(s => `<li>${s}</li>`).join(''));
    
    // Inject Chart Data (for the new floating bar chart)
    const chartData = result.budgetStatus.map(b => ({
      name: b.name,
      spent: b.spent,
      limit: b.limit,
    }));
    template = template.replace('{{expenseChartData}}', JSON.stringify(chartData));

    // Inject Savings Goals Status
    const savingsGoalRows = result.savingsGoalStatus.map(goal => `
        <tr>
            <td class="px-6 py-4">${goal.name}</td>
            <td class="px-6 py-4 num-cell">${formatCurrency(goal.targetAmount)}</td>
            <td class="px-6 py-4 num-cell">${formatCurrency(goal.fundedAmount)}</td>
            <td class="px-6 py-4"><span class="bg-${goal.status === 'Achieved' ? 'green' : 'yellow'}-100 text-${goal.status === 'Achieved' ? 'green' : 'yellow'}-700 px-3 py-1 rounded-full text-xs font-bold">${goal.status}</span></td>
        </tr>
    `).join('');
    template = template.replace('{{savingsGoalRows}}', savingsGoalRows);

    // Inject Budget Status
    const budgetRows = result.budgetStatus.map(budget => `
        <tr>
            <td class="px-6 py-4">${budget.name}</td>
            <td class="px-6 py-4 num-cell">${formatCurrency(budget.limit)}</td>
            <td class="px-6 py-4 num-cell">${formatCurrency(budget.spent)}</td>
            <td class="px-6 py-4"><span class="bg-${budget.status === 'Within Limit' ? 'green' : 'red'}-100 text-${budget.status === 'Within Limit' ? 'green' : 'red'}-700 px-3 py-1 rounded-full text-xs font-bold">${budget.status}</span></td>
        </tr>
    `).join('');
    template = template.replace('{{budgetRows}}', budgetRows);


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
