
'use server';
/**
 * @fileOverview A flow to generate a dashboard summary using the Zoho Catalyst LLM.
 * It calculates financial metrics and gets an AI-powered suggestion.
 */
import { generateText } from '@/services/catalyst';
import type {
  GenerateDashboardSummaryInput,
  GenerateDashboardSummaryOutput,
} from '@/ai/schemas/dashboard-summary';

// Helper to safely parse currency strings
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

export async function generateDashboardSummary(
  input: GenerateDashboardSummaryInput
): Promise<GenerateDashboardSummaryOutput> {
  const {transactions} = input;

  if (!transactions || transactions.length === 0) {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      savingsRate: 0,
      suggestion: 'Start by adding some transactions to see your financial summary.',
    };
  }

  // 1. Calculate totals server-side
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(t => {
    const amount = parseCurrency(t.amount);
    if (t.type === 'income') {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
    }
  });

  const savingsRate =
    totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  // 2. Generate AI suggestion
  const transactionsSample = transactions
    .slice(0, 15)
    .map(t => `- ${t.description}: ${t.amount} (${t.type}) on ${t.date}`)
    .join('\n');

  const systemPrompt = `You are a financial analyst for "WealthIn". Your response must be a single sentence.`;

  const userPrompt = `Based on the following financial summary and transaction list for an entrepreneur, provide one short, actionable "Fin Bite" (a financial tip).

Financial Summary:
- Total Income: ${totalIncome}
- Total Expenses: ${totalExpenses}
- Savings Rate: ${savingsRate}%

Transaction List (sample):
${transactionsSample}
`;

  try {
    // Removed the model override, as the default service model is now correct.
    const suggestion = await generateText(
        userPrompt, 
        systemPrompt
    );
    // 3. Return combined result
    return {
      totalIncome,
      totalExpenses,
      savingsRate,
      suggestion: suggestion || 'Review your spending to find potential savings opportunities.',
    };
  } catch (e: any) {
    // This is the new, more robust error handling.
    // It specifically checks for the configuration error and provides a user-friendly message.
    if (e.message.includes('CRITICAL RUNTIME ERROR') || e.message.includes('invalid_client')) {
       return {
        totalIncome,
        totalExpenses,
        savingsRate,
        suggestion: 'AI features are temporarily unavailable due to a configuration issue. Please contact support.',
      };
    }
    // Re-throw other, unexpected errors so they can still be debugged.
    throw e; 
  }
}
