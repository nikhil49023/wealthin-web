
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document using a Vision Language Model (VLM).
 */
import catalystService from '@/services/catalyst';
import type {
  ExtractTransactionsInput,
  ExtractTransactionsOutput,
} from '@/ai/schemas/transactions';
import { ExtractTransactionsOutputSchema } from '@/ai/schemas/transactions';
import { cleanAndParseJSON } from '@/lib/cleanJson';

export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {
  let base64Images: string[] = [];
  try {
    const uris = Array.isArray(input.documentDataUri) ? input.documentDataUri : [input.documentDataUri];
    
    base64Images = uris.map(uri => {
        const parts = uri.split(',');
        if (parts.length !== 2 || !parts[0].includes(';base64')) {
            throw new Error("Invalid data URI format encountered. Expected Base64 encoded data.");
        }
        return parts[1];
    });

  } catch (e: any) {
    console.error("Failed to process data URI(s):", e);
    throw new Error("Could not extract image data from the provided file(s).");
  }

  const vlmUserPrompt = `
You are an expert financial data analyst. Analyze the provided image(s) of a financial document (like a bank statement or transaction list).
Your task is to extract all transactions and return them as a valid JSON object.

The JSON object must conform to this exact schema:
{
  "transactions": [
    {
      "description": "(string) A clear description of the transaction.",
      "date": "(string) The date and time of the transaction, extracted exactly as it appears in the document. Do not reformat it.",
      "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals and 'income' for credits/deposits.",
      "amount": "(number) The transaction amount as a raw number, without any currency symbols or commas."
    }
  ]
}

- For debits, withdrawals, or payments, the 'type' must be 'expense'.
- For credits,deposits, or fund transfers in, the 'type' must be 'income'.
- The 'date' field MUST be a string containing the date and time exactly as seen in the document.
- The 'amount' field MUST be a raw number (e.g., 1234.56).

Your response MUST be ONLY the JSON object. Do not include any other text, markdown formatting (like \`\`\`json), or explanations.
`;

  try {
    const jsonResponseText = await catalystService.generateTextFromImage(vlmUserPrompt, base64Images);
    
    const parsedData = cleanAndParseJSON(jsonResponseText);
    
    // Zod will now automatically handle minor type issues like coercing string numbers to numbers.
    const validatedData = ExtractTransactionsOutputSchema.parse(parsedData);
    
    return validatedData;

  } catch (e: any) {
    console.error('Error during transaction extraction flow:', e.message);
    // Re-throw the specific error from the nested try-catch blocks or a generic one
    throw new Error(e.message || 'Could not extract transactions. The AI returned an invalid format or the document content was unparsable.');
  }
}
