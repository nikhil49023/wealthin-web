
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document using a hybrid approach.
 * It uses a text model for text-based documents (PDF, TXT, CSV) and a vision model for images.
 */
import catalystService from '@/services/catalyst';
import type {
  ExtractTransactionsInput,
  ExtractTransactionsOutput,
  ExtractedTransaction,
} from '@/ai/schemas/transactions';
import { ExtractTransactionsOutputSchema } from '@/ai/schemas/transactions';
import { cleanAndParseJSON } from '@/lib/cleanJson';

// Function to process a document or image using the Vision Language Model (VLM)
async function processWithVisionModel(base64Image: string): Promise<ExtractedTransaction[]> {
  const vlmSystemPrompt = `You are an expert financial data analyst. You MUST return ONLY a valid JSON array of transactions. Do not include any other text, markdown formatting (like \`\`\`json), or explanations.`;

  const vlmUserPrompt = `
Analyze the provided image of a financial document (like a bank statement page or transaction list).
Your task is to extract all transactions and return them as a valid JSON array.

The JSON array must be an array of objects, where each object conforms to this exact schema:
{
  "description": "(string) A clear description of the transaction.",
  "date": "(string) The date of the transaction, extracted exactly as it appears in the document. Do not reformat it.",
  "time": "(string, optional) The time of the transaction if available, extracted exactly as it appears.",
  "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals and 'income' for credits/deposits.",
  "amount": "(number) The transaction amount as a raw number, without any currency symbols or commas."
}

- If no time is available for a transaction, omit the 'time' field.
- The 'amount' field MUST be a raw number (e.g., 1234.56).
- If no transactions are found, return an empty array [].
`;

  const jsonResponseText = await catalystService.generateTextFromImage(vlmUserPrompt, [base64Image], vlmSystemPrompt);
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
    
    // Process each document URI individually
    for (const uri of uris) {
        const mimeTypeMatch = uri.match(/^data:(.*?);base64,/);
        if (!mimeTypeMatch) {
            console.warn("Skipping invalid data URI.");
            continue;
        }
        const base64Data = uri.split(',')[1];
        
        let extracted: ExtractedTransaction[] = [];
        
        // Route all file types through the vision model.
        // Modern VLMs are effective at OCR on document images/PDFs.
        // This avoids issues with passing large base64 text in prompts to text-only models.
        extracted = await processWithVisionModel(base64Data);
        
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
    console.error('Error during transaction extraction flow:', e.message);
    // Provide a more user-friendly error message
    if (e.message.includes("malformed JSON")) {
        throw new Error('The AI returned an invalid format. Please try a different document or check the document quality.');
    }
    throw new Error(e.message || 'Could not extract transactions due to an unexpected error.');
  }
}
