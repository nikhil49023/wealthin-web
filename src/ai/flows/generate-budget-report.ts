
'use server';

/**
 * @fileOverview A flow for generating a budget report from a list of transactions using the Zoho Catalyst LLM.
 */
import catalystService from '@/services/catalyst';
import type {
  GenerateBudgetReportInput,
  GenerateBudgetReportOutput,
} from '@/ai/schemas/budget-report';

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

export async function generateBudgetReport(
  input: GenerateBudgetReportInput
): Promise<GenerateBudgetReportOutput> {
  const transactionsList = input.transactions
    .map(t => `- ${t.description}: ${t.amount} (${t.type}) on ${t.date}`)
    .join('\n');

  const systemPrompt = `You are a financial analyst. Your response MUST be ONLY a valid JSON object that conforms to the output schema. Do NOT include any other text, markdown, or explanations.`;
  
  const userPrompt = `Based on the following transactions, provide a spending analysis and a detailed expense breakdown.
Group similar expenses into logical categories (e.g., "Food", "Transport", "Shopping").

Your response must match this JSON schema exactly:
{
  "summary": "An AI-generated summary and analysis of the spending habits...",
  "expenseBreakdown": [
    { "name": "CategoryName", "value": 1234.56 },
    ...
  ]
}

Here is the list of transactions to analyze:
${transactionsList}
`;

  try {
    const responseText = await catalystService.generateText(userPrompt, systemPrompt);
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    // Manually calculate overall breakdown
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

    parsed.overallBreakdown = [
        { name: 'Total Income', value: totalIncome },
        { name: 'Total Expenses', value: totalExpenses },
        { name: 'Savings', value: savings }
    ].filter(item => item.value > 0); // Only show items with a value

    // Ensure expense breakdown is always an array
    if (!parsed.expenseBreakdown) {
      parsed.expenseBreakdown = [];
    }
    
    return parsed as GenerateBudgetReportOutput;
  } catch (e: any) {
    console.error('Failed to parse JSON from model response:', e.message);
    throw new Error('Could not generate budget report. The AI returned an invalid format.');
  }
}
