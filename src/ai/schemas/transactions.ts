/**
 * @fileOverview Zod schemas and TypeScript types for transaction extraction.
 *
 * - ExtractedTransaction - The schema for a single extracted transaction.
 * - ExtractTransactionsInput - The input type for the extraction function.
 * - ExtractTransactionsOutput - The return type for the extraction function.
 */

import { z } from 'zod';

export const ExtractedTransactionSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  date: z
    .string()
    .describe('The date of the transaction in DD/MM/YYYY format.'),
  type: z
    .enum(['income', 'expense'])
    .describe('The type of transaction (income or expense).'),
  amount: z
    .string()
    .describe("The transaction amount, formatted as a string with currency (e.g., 'INR 1,234.56')."),
  invoiceUrl: z.string().optional().describe("The URL of the attached invoice file in Firebase Storage."),
});
export type ExtractedTransaction = z.infer<typeof ExtractedTransactionSchema>;

export const ExtractTransactionsInputSchema = z.object({
  documentDataUri: z.union([z.string(), z.array(z.string())])
    .describe(
      "A document (like a bank statement) containing transactions, as a single data URI or an array of data URIs for multi-page documents. Each URI must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTransactionsInput = z.infer<
  typeof ExtractTransactionsInputSchema
>;

export const ExtractTransactionsOutputSchema = z.object({
  transactions: z
    .array(ExtractedTransactionSchema)
    .describe('An array of extracted transactions.'),
});
export type ExtractTransactionsOutput = z.infer<
  typeof ExtractTransactionsOutputSchema
>;
