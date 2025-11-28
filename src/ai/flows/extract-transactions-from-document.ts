
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document image using a Vision Language Model.
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
    
    throw new Error("The AI model did not return a valid JSON object block.");
}


export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {

  let base64Image: string;
  try {
      base64Image = input.documentDataUri.split(',')[1];
      if (!base64Image) {
        throw new Error("Invalid data URI format provided.");
      }
  } catch (e) {
      console.error("Failed to decode data URI:", e);
      throw new Error("Could not extract image data from the provided file.");
  }

  // Use the VLM to directly extract and structure the data in one step
  const vlmPrompt = `Analyze the provided financial document image and extract all financial transactions.
Your response MUST be ONLY a valid JSON object that conforms to the specified schema. Do NOT include any other text, markdown formatting (like \`\`\`json), or explanations.

The JSON object must have a single root key "transactions", which is an array of transaction objects.
Each transaction object in the array must have the following keys:
- "description": (string) A clear description of the transaction.
- "date": (string) The date in DD/MM/YYYY format. If the year is not specified, assume the current year.
- "type": (string) Must be either "income" or "expense".
- "amount": (string) The transaction amount, formatted as a string with currency (e.g., "INR 1,234.56").

Now, generate the JSON object based on the document image.
`;

  try {
    const rawExtractedText = await catalystService.generateTextFromImage(vlmPrompt, [base64Image]);
    if (!rawExtractedText || rawExtractedText.trim() === '') {
        throw new Error("The vision model did not return any text from the document.");
    }

    const jsonString = cleanJsonString(rawExtractedText);
    const parsed = JSON.parse(jsonString);

    return ExtractTransactionsOutputSchema.parse(parsed);

  } catch (e: any) {
    console.error('Failed to parse response from VLM model:', e.message);
    // Log the raw response for debugging if possible, without leaking sensitive data
    // console.error('Raw AI Response:', rawExtractedText); 
    throw new Error('Could not extract transactions. The AI returned an invalid format.');
  }
}
