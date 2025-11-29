
'use server';

import catalystService from '@/services/catalyst';
import type {
  GenerateBudgetReportInput,
  GenerateBudgetReportOutput,
} from '@/ai/schemas/budget-report';
import { GenerateBudgetReportOutputSchema } from '@/ai/schemas/budget-report';

function parseCurrency(amount: string | number): number {
  if (typeof amount === 'number') {
    return amount;
  }
  if (typeof amount === 'string') {
    const sanitizedAmount = amount.replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(sanitizedAmount);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export async function generateBudgetReport(
  input: GenerateBudgetReportInput
): Promise<GenerateBudgetReportOutput> {
  const transactionsList = input.transactions
    .map(t => `- ${t.description}: ${t.amount} (${t.type}) on ${t.date}`)
    .join('\n');
    
  const budgetsList = input.budgets
    .map(b => `- ${b.name}: ${b.amount}`)
    .join('\n');

  const goalsList = input.savingsGoals
    .map(g => `- ${g.name}: ${g.targetAmount}`)
    .join('\n');

  const systemPrompt = `You are a financial analyst. Your response MUST be ONLY a valid JSON object that conforms to the output schema. Do NOT include any other text, markdown, or explanations.`;
  
  const userPrompt = `Based on the following transactions, provide a detailed financial analysis.

Your response must be a JSON object that conforms exactly to this schema:
{
  "summary": "(string) A 2-3 sentence summary of the user's financial activity for the month.",
  "suggestions": [
      "(string) Actionable suggestion 1.",
      "(string) Actionable suggestion 2.",
      "(string) Actionable suggestion 3."
  ],
  "expenseBreakdown": [
    { "name": "(string) CategoryName", "value": "(number) Total amount for this category" },
    ...
  ]
}

- For 'summary', provide a brief, professional overview.
- For 'suggestions', provide three distinct, practical tips for financial improvement based on the data.
- For 'expenseBreakdown', group similar expenses into logical categories (e.g., "Food & Dining", "Transport", "Shopping", "Bills & Utilities", "Entertainment"). Sum up the total for each category.

Here is the list of transactions to analyze:
${transactionsList}
`;

  try {
    const responseText = await catalystService.generateText(userPrompt, systemPrompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI did not return a valid JSON object.");
    }
    const cleanedText = jsonMatch[0];
    const parsed = JSON.parse(cleanedText);

    // --- Server-side Calculations ---
    let totalIncome = 0;
    let totalExpenses = 0;
    input.transactions.forEach(t => {
        const amount = parseCurrency(t.amount);
        if (t.type === 'income') {
            totalIncome += amount;
        } else {
            totalExpenses += amount;
        }
    });
    
    const savings = Math.max(0, totalIncome - totalExpenses);
    const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;
    
    parsed.overallBreakdown = {
        totalIncome,
        totalExpenses,
        savings,
        savingsRate
    };

    // Calculate budget status
    parsed.budgetStatus = input.budgets.map(budget => {
        const spent = input.transactions
            .filter(t => t.type === 'expense' && t.description.toLowerCase().includes(budget.name.toLowerCase()))
            .reduce((sum, t) => sum + parseCurrency(t.amount), 0);
        return {
            name: budget.name,
            limit: budget.amount,
            spent: spent,
            status: spent > budget.amount ? 'Over Limit' : 'Within Limit'
        };
    });

    // Calculate savings goal status
    parsed.savingsGoalStatus = input.savingsGoals.map(goal => {
        return {
            name: goal.name,
            targetAmount: goal.targetAmount,
            fundedAmount: savings, // For simplicity, we assume all savings contribute to all goals
            status: savings >= goal.targetAmount ? 'Achieved' : 'In Progress'
        };
    });


    return GenerateBudgetReportOutputSchema.parse(parsed);
    
  } catch (e: any) {
    console.error('Failed to parse JSON from model response:', e.message);
    throw new Error('Could not generate budget report. The AI returned an invalid format.');
  }
}
