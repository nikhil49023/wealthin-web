
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document image using a Vision Language Model (VLM).
 */
import catalystService from '@/services/catalyst';
import type {
  ExtractTransactionsInput,
  ExtractTransactionsOutput,
} from '@/ai/schemas/transactions';
import { ExtractTransactionsOutputSchema } from '@/ai/schemas/transactions';

export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {

  let base64Image: string;
  try {
      // The VLM API expects the raw base64 string, so we must strip the data URI prefix.
      base64Image = input.documentDataUri.split(',')[1];
      if (!base64Image) {
        throw new Error("Invalid data URI format.");
      }
  } catch (e) {
      console.error("Failed to decode data URI:", e);
      throw new Error("Could not extract image data from the provided file.");
  }


  const systemPrompt = `You are an expert at extracting structured data from documents. Your response MUST be ONLY a valid JSON object that conforms to the specified schema. Do NOT include any other text, markdown, or explanations.`;

  const userPrompt = `Analyze the provided financial document image and extract all financial transactions you can find.

Fields to extract:
- "description": A clear description of the transaction.
- "date": The date in DD/MM/YYYY format. If the year is not specified, assume the current year.
- "type": Must be either "income" (for credits/deposits) or "expense" (for debits/withdrawals).
- "amount": The transaction amount, formatted as a string with currency (e.g., "INR 1,234.56").

Your response MUST be a JSON object with a single key "transactions" which contains an array of transaction objects.
`;

  try {
    const responseText = await catalystService.generateTextFromImage(userPrompt, [base64Image]);
    
    // Find the start and end of the JSON object
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error("No valid JSON object found in the AI response.");
    }
    
    const jsonString = responseText.substring(startIndex, endIndex + 1);
    const parsed = JSON.parse(jsonString);

    return ExtractTransactionsOutputSchema.parse(parsed);
  } catch (e: any) {
    console.error('Failed to parse JSON from VLM model response:', e);
    throw new Error('Could not extract transactions. The AI returned an invalid format.');
  }
}
