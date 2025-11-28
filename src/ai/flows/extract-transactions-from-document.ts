
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document image using a two-step AI process.
 * 1. A Vision Language Model (VLM) extracts raw text from the document.
 * 2. A powerful Language Model (LLM) structures this text into clean JSON.
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
      base64Image = input.documentDataUri.split(',')[1];
      if (!base64Image) {
        throw new Error("Invalid data URI format.");
      }
  } catch (e) {
      console.error("Failed to decode data URI:", e);
      throw new Error("Could not extract image data from the provided file.");
  }

  // --- Step 1: Use VLM to extract raw text from the image ---
  const vlmPrompt = `Analyze the provided financial document image and extract all financial transactions you can find.
List each transaction on a new line. Include description, date, type (income/credit or expense/debit), and amount.`;

  let rawExtractedText: string;
  try {
    rawExtractedText = await catalystService.generateTextFromImage(vlmPrompt, [base64Image]);
    if (!rawExtractedText || rawExtractedText.trim() === '') {
        throw new Error("The vision model did not return any text from the document.");
    }
  } catch(e: any) {
    console.error('Failed to get raw text from VLM model:', e);
    throw new Error('The AI vision model failed to process the document image.');
  }


  // --- Step 2: Use LLM to structure the raw text into clean JSON ---
  const llmSystemPrompt = `You are an expert at structuring data into JSON. Your response MUST be ONLY a valid JSON object that conforms to the specified schema. Do NOT include any other text, markdown (like \`\`\`json), or explanations.`;
  
  const llmUserPrompt = `From the following raw text, extract the financial transactions and format them into a JSON object.

The JSON object must have a single key "transactions", which contains an array of transaction objects.
Each transaction object must have these keys:
- "description": (string) A clear description of the transaction.
- "date": (string) The date in DD/MM/YYYY format. If the year is not specified, assume the current year.
- "type": (string) Must be either "income" or "expense".
- "amount": (string) The transaction amount, formatted as a string with currency (e.g., "INR 1,234.56").

Raw Text to process:
---
${rawExtractedText}
---

Now, generate the JSON object.
`;

  try {
    const jsonText = await catalystService.generateText(llmUserPrompt, llmSystemPrompt);
    
    // Clean the response one last time to be safe
    const startIndex = jsonText.indexOf('{');
    const endIndex = jsonText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) {
      throw new Error("The AI language model did not return a valid JSON object.");
    }
    const jsonString = jsonText.substring(startIndex, endIndex + 1);
    
    const parsed = JSON.parse(jsonString);

    return ExtractTransactionsOutputSchema.parse(parsed);

  } catch (e: any) {
    console.error('Failed to parse JSON from LLM model response:', e);
    throw new Error('Could not extract transactions. The AI returned an invalid format.');
  }
}
