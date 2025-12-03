
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document using a hybrid approach.
 * It uses a vision model which is effective for both images and document pages (like PDFs).
 */
import catalystService from '@/services/catalyst';
import type {
  ExtractTransactionsInput,
  ExtractTransactionsOutput,
  ExtractedTransaction,
} from '@/ai/schemas/transactions';
import { ExtractTransactionsOutputSchema } from '@/ai/schemas/transactions';
import { cleanAndParseJSON } from '@/lib/cleanJson';

// This function processes a document or image using the Vision Language Model (VLM)
async function processWithVisionModel(base64Image: string): Promise<ExtractedTransaction[]> {
  const vlmSystemPrompt = `You are an expert financial data analyst specializing in Indian financial documents. You MUST return ONLY a valid JSON array of transactions. Do not include any other text, markdown formatting (like \`\`\`json), or explanations.`;

  const vlmUserPrompt = `
Analyze the provided image of a financial document (like a bank statement page or receipt).
Your task is to extract all transactions and return them as a valid JSON array.

The JSON array must be an array of objects, where each object conforms to this exact schema:
{
  "description": "(string) A clear and concise description of the transaction.",
  "date": "(string) The date of the transaction. IMPORTANT: You must normalize this to YYYY-MM-DD format.",
  "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals and 'income' for credits/deposits.",
  "amount": "(number) The transaction amount as a raw number, without currency symbols or commas. Correctly parse Indian number formats (e.g., '1,23,456.78' becomes 123456.78).",
  "category": "(string, optional) Categorize the transaction into one of the following: 'Food', 'Transport', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Health', 'Rent', 'Salary', or 'Other'."
}

- For dates, always convert them to a standard YYYY-MM-DD format. For example, '03/05/24' becomes '2024-05-03'.
- The 'amount' field MUST be a raw number.
- If a clear category cannot be determined, you may omit the 'category' field.
- If no transactions are found, return an empty array [].
`;

  const jsonResponseText = await catalystService.generateTextFromImage(vlmUserPrompt, [base64Image], vlmSystemPrompt);
  
  // Use the robust cleaner to parse the response
  const parsedData = cleanAndParseJSON(jsonResponseText);
  
  // The schema expects an object with a 'transactions' property, so we wrap the array
  const validatedData = ExtractTransactionsOutputSchema.parse({ transactions: parsedData });
  return validatedData.transactions;
}


export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {
  try {
    const uris = Array.isArray(input.documentDataUri) ? input.documentDataUri : [input.documentDataUri];
    let allTransactions: ExtractedTransaction[] = [];
    
    // Process each document URI individually using the vision model
    for (const uri of uris) {
        const mimeTypeMatch = uri.match(/^data:(.*?);base64,/);
        if (!mimeTypeMatch) {
            console.warn("Skipping invalid data URI.");
            continue;
        }
        const base64Data = uri.split(',')[1];
        
        let extracted: ExtractedTransaction[] = await processWithVisionModel(base64Data);
        
        if (extracted.length > 0) {
            allTransactions.push(...extracted);
        }
    }

    if (allTransactions.length === 0) {
      throw new Error("No transactions were extracted from the document(s). The document might be empty, unreadable, or not a financial statement.");
    }

    const finalResult = { transactions: allTransactions };
    // Final validation of the combined result
    const validatedData = ExtractTransactionsOutputSchema.parse(finalResult);
    return validatedData;

  } catch (e: any) {
    console.error('Error during transaction extraction flow:', e);
    // Provide a more user-friendly error message
    if (e.message.includes("AI returned an invalid")) {
        throw new Error('The AI returned an invalid format that could not be fixed. Please try a different document or check the document quality.');
    }
    throw new Error(e.message || 'Could not extract transactions due to an unexpected error.');
  }
}
