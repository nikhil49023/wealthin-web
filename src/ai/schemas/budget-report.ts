
import { z } from 'zod';
import { ExtractedTransactionSchema } from './transactions';

// Schemas for Budget Report
export const GenerateBudgetReportInputSchema = z.object({
  transactions: z
    .array(ExtractedTransactionSchema)
    .describe('An array of financial transactions, including both income and expenses.'),
});
export type GenerateBudgetReportInput = z.infer<typeof GenerateBudgetReportInputSchema>;

export const GenerateBudgetReportOutputSchema = z.object({
  summary: z.string().describe('An AI-generated summary and analysis of the spending habits, suitable for including in a report for IT returns.'),
  expenseBreakdown: z
    .array(z.object({ name: z.string(), value: z.number() }))
    .describe('A JSON array of expense categories and their total amounts for a pie chart.'),
  overallBreakdown: z
    .array(z.object({ name: z.string(), value: z.number() }))
    .optional()
    .describe('A JSON array containing total income and total expenses for a pie chart.'),
});
export type GenerateBudgetReportOutput = z.infer<typeof GenerateBudgetReportOutputSchema>;
