
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

/**
 * Cleans the raw text response from an AI model to extract a valid JSON string.
 * It looks for a JSON block enclosed in markdown backticks (```json ... ```)
 * or falls back to finding the first and last curly braces.
 * @param text The raw text response from the AI.
 * @returns A clean JSON string.
 * @throws An error if a valid JSON object cannot be found.
 */
function cleanJsonString(text: string): string {
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonBlockRegex);

    if (match && match[1]) {
        return match[1].trim();
    }
    
    // Fallback for cases where markdown is not used
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        return text.substring(startIndex, endIndex + 1);
    }
    
    if (text && text.trim() && text.startsWith('{')) {
        return text;
    }

    throw new Error("The AI model did not return a valid JSON object block.");
}


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
      "date": "(string) The date in DD/MM/YYYY format. If the year is not specified, assume the current year.",
      "datetime": "(string) The full date and time of the transaction in ISO 8601 format (YYYY-MM-DDTHH:mm:ss). If the time is not present, default to 00:00:00 for that day.",
      "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals and 'income' for credits/deposits.",
      "amount": "(string) The transaction amount, formatted as a string with currency (e.g., 'INR 1,234.56')."
    }
  ]
}

- For debits, withdrawals, or payments, the 'type' must be 'expense'.
- For credits, deposits, or fund transfers in, the 'type' must be 'income'.
- Ensure amounts are captured accurately with currency symbols.

Your response MUST be ONLY the JSON object. Do not include any other text, markdown formatting (like \`\`\`json), or explanations.
`;


  try {
    const jsonResponseText = await catalystService.generateTextFromImage(vlmUserPrompt, base64Images);
    const jsonString = cleanJsonString(jsonResponseText);
    const parsed = JSON.parse(jsonString);

    // After parsing, validate against the Zod schema to ensure correctness
    return ExtractTransactionsOutputSchema.parse(parsed);

  } catch (e: any) {
    console.error('Failed to parse structured JSON from VLM:', e.message);
    throw new Error('Could not extract transactions. The AI returned an invalid format or the document content was unparsable.');
  }
}
