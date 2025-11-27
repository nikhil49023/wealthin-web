
'use server';
/**
 * @fileOverview A flow to generate a dashboard summary using Firebase AI.
 * It calculates financial metrics and gets an AI-powered suggestion.
 */
import {initializeApp, getApps} from 'firebase/app';
import {getAI, getGenerativeModel, GoogleAIBackend} from 'firebase/ai';
import {app} from '@/lib/firebase';
import type {
  GenerateDashboardSummaryInput,
  GenerateDashboardSummaryOutput,
} from '@/ai/schemas/dashboard-summary';

const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, {model: 'gemini-1.5-flash-latest'});

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

  const prompt = `You are a financial analyst for "WealthIn". Based on the following financial summary and transaction list for an entrepreneur, provide one short, actionable "Fin Bite" (a financial tip). Your response must be a single sentence.

Financial Summary:
- Total Income: ${totalIncome}
- Total Expenses: ${totalExpenses}
- Savings Rate: ${savingsRate}%

Transaction List (sample):
${transactionsSample}
`;

  const {response} = await model.generateContent(prompt);
  const suggestion = response.text();

  // 3. Return combined result
  return {
    totalIncome,
    totalExpenses,
    savingsRate,
    suggestion: suggestion || 'Review your spending to find potential savings opportunities.',
  };
}
