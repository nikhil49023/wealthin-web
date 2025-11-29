
import { z } from 'zod';
import { ExtractedTransactionSchema } from './transactions';

const BudgetSchema = z.object({
    id: z.string(),
    name: z.string(),
    amount: z.number(),
});

const SavingsGoalSchema = z.object({
    id: z.string(),
    name: z.string(),
    targetAmount: z.number(),
});


// Schemas for Budget Report
export const GenerateBudgetReportInputSchema = z.object({
  transactions: z
    .array(ExtractedTransactionSchema)
    .describe('An array of financial transactions, including both income and expenses.'),
  budgets: z.array(BudgetSchema).describe("The user's defined budgets."),
  savingsGoals: z.array(SavingsGoalSchema).describe("The user's defined savings goals."),
});
export type GenerateBudgetReportInput = z.infer<typeof GenerateBudgetReportInputSchema>;

export const GenerateBudgetReportOutputSchema = z.object({
  summary: z.string().describe('A 2-3 sentence summary of the user\'s financial activity.'),
  suggestions: z.array(z.string()).describe('An array of three actionable financial suggestions.'),
  expenseBreakdown: z
    .array(z.object({ name: z.string(), value: z.number() }))
    .describe('A JSON array of expense categories and their total amounts for a bar chart.'),
  overallBreakdown: z.object({
      totalIncome: z.number(),
      totalExpenses: z.number(),
      savings: z.number(),
      savingsRate: z.number(),
  }).describe('An object containing the calculated totals.'),
  budgetStatus: z.array(z.object({
      name: z.string(),
      limit: z.number(),
      spent: z.number(),
      status: z.enum(['Within Limit', 'Over Limit']),
  })).describe('The status of each budget limit.'),
  savingsGoalStatus: z.array(z.object({
      name: z.string(),
      targetAmount: z.number(),
      fundedAmount: z.number(),
      status: z.enum(['In Progress', 'Achieved']),
  })).describe('The status of each savings goal.'),
});
export type GenerateBudgetReportOutput = z.infer<typeof GenerateBudgetReportOutputSchema>;
