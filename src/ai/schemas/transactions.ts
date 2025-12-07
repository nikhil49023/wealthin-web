
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
    .describe('The date of the transaction, extracted and normalized to YYYY-MM-DD format.'),
  time: z
    .string()
    .optional()
    .describe('The time of the transaction, extracted exactly as it appears in the document.'),
  type: z
    .enum(['income', 'expense'])
    .describe('The type of transaction (income or expense).'),
  amount: z
    .coerce.number()
    .describe("The transaction amount as a number."),
  invoiceUrl: z.string().optional().describe("The URL of the attached invoice file in Firebase Storage."),
});
export type ExtractedTransaction = z.infer<typeof ExtractedTransactionSchema>;

export const ExtractTransactionsInputSchema = z.object({
  documentDataUri: z.string()
    .describe(
      "A document page containing transactions, as a data URI. The URI must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  mimeType: z.string().describe("The MIME type of the document (e.g., 'application/pdf', 'image/png').")
});
export type ExtractTransactionsInput = z.infer<
  typeof ExtractTransactionsInputSchema
>;

export const ExtractTransactionsOutputSchema = z.object({
  transactions: z
    .array(ExtractedTransactionSchema)
    .min(1, { message: "No transactions were found in the document." })
    .describe('An array of extracted transactions.'),
});
export type ExtractTransactionsOutput = z.infer<
  typeof ExtractTransactionsOutputSchema
>;
