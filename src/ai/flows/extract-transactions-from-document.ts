
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document's text content.
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
    
    if (text && text.trim()) {
        console.warn("AI did not return JSON. Trying to parse raw text.");
        return text;
    }

    throw new Error("The AI model did not return a valid JSON object block.");
}


export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {

  let rawTextContent: string;
  try {
      // The input can be a single URI or an array for multi-page/multi-file, but we'll join them.
      const uris = Array.isArray(input.documentDataUri) ? input.documentDataUri : [input.documentDataUri];
      
      const decodedTexts = uris.map(uri => {
          const parts = uri.split(',');
          if (parts.length !== 2 || !parts[0].includes(';base64')) {
              throw new Error("Invalid data URI format encountered. Expected Base64 encoded data.");
          }
          // Decode the Base64 string to its original text format
          return Buffer.from(parts[1], 'base64').toString('utf8');
      });

      rawTextContent = decodedTexts.join('\n\n--- Document Break ---\n\n');

      if (!rawTextContent.trim()) {
        throw new Error("The provided document is empty or could not be read.");
      }
  } catch (e) {
      console.error("Failed to decode data URI(s) to text:", e);
      throw new Error("Could not extract text from the provided file(s). Ensure they are text-based (like CSV or TXT).");
  }
  
  // Use a powerful language model to structure the raw text into JSON
  const structuringSystemPrompt = `You are an expert data processor specializing in financial records.
Your only job is to convert the user's raw text data (likely from a CSV or similar format) into a valid JSON object.
Your response MUST be ONLY the JSON object and nothing else. Do not add any explanation, commentary, or markdown formatting.
The JSON object must conform to this exact schema:
{
  "transactions": [
    {
      "description": "(string) A clear description of the transaction.",
      "date": "(string) The date in DD/MM/YYYY format. If the year is not specified, assume the current year.",
      "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals and 'income' for credits/deposits.",
      "amount": "(string) The transaction amount, formatted as a string with currency (e.g., 'INR 1,234.56')."
    }
  ]
}`;
  
  const structuringUserPrompt = `
Here is the raw text extracted from a financial document. Convert it into a valid JSON object as per the schema I provided.

--- RAW TEXT ---
${rawTextContent}
--- END RAW TEXT ---

Generate the JSON object now.
`;

  try {
    const jsonResponseText = await catalystService.generateText(structuringUserPrompt, structuringSystemPrompt);
    const jsonString = cleanJsonString(jsonResponseText);
    const parsed = JSON.parse(jsonString);

    // After parsing, validate against the Zod schema to ensure correctness
    return ExtractTransactionsOutputSchema.parse(parsed);

  } catch (e: any) {
    console.error('Failed to parse structured JSON from LLM:', e.message);
    throw new Error('Could not extract transactions. The AI returned an invalid format or the document content was unparsable.');
  }
}
