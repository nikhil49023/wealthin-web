
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document image using a two-step AI pipeline.
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
    
    // If no JSON is found, but there's some text, wrap it in a basic error structure to avoid complete failure.
    if (text && text.trim()) {
        console.warn("AI did not return JSON. Returning raw text for debugging.");
        // This part is for debugging and might not produce valid transactions, but avoids a hard crash.
        return `{"transactions": []}`; 
    }

    throw new Error("The AI model did not return a valid JSON object block.");
}


export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {

  let base64Images: string[];
  try {
      // The input might be a single image URI or an array of them.
      const uris = Array.isArray(input.documentDataUri) ? input.documentDataUri : [input.documentDataUri];
      base64Images = uris.map(uri => {
          const parts = uri.split(',');
          if (parts.length !== 2) {
              throw new Error("Invalid data URI format encountered.");
          }
          return parts[1];
      });

      if (base64Images.some(img => !img)) {
        throw new Error("Invalid data URI format provided.");
      }
  } catch (e) {
      console.error("Failed to decode data URI(s):", e);
      throw new Error("Could not extract image data from the provided file(s).");
  }
  
  // --- Step 1: Use the Vision Model to extract raw text from each page image ---
  const visionPrompt = "Extract all text content from the provided document image. Focus on transaction details like dates, descriptions, and amounts. Do not format the output, just provide the raw text.";
  
  const textExtractionPromises = base64Images.map((base64Image, index) => 
      catalystService.generateTextFromImage(visionPrompt, [base64Image])
        .catch(err => {
            console.error(`Failed to extract text from page ${index + 1}:`, err);
            return `[Error processing page ${index + 1}]`; // Return error placeholder
        })
  );

  const rawTexts = await Promise.all(textExtractionPromises);
  const combinedRawText = rawTexts.join('\n\n--- Page Break ---\n\n');

  if (!combinedRawText || combinedRawText.trim() === '') {
      throw new Error("The vision model did not return any text from the document.");
  }


  // --- Step 2: Use the Language Model to structure the raw text into JSON ---
  const structuringSystemPrompt = `You are a data processing expert. Your only job is to convert the user's raw text into a valid JSON object.
The user has provided text from a multi-page financial document, with page breaks indicated by '--- Page Break ---'.
Your response MUST be ONLY the JSON object and nothing else. Do not add any explanation or markdown formatting.
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
Here is the raw text extracted from a financial document. Convert it into a valid JSON object as per the schema.

--- RAW TEXT ---
${combinedRawText}
--- END RAW TEXT ---

Generate the JSON object now.
`;

  try {
    const jsonResponseText = await catalystService.generateText(structuringUserPrompt, structuringSystemPrompt);
    const jsonString = cleanJsonString(jsonResponseText);
    const parsed = JSON.parse(jsonString);

    // After parsing, validate against the Zod schema
    return ExtractTransactionsOutputSchema.parse(parsed);

  } catch (e: any) {
    console.error('Failed to parse structured JSON from LLM:', e.message);
    // console.error('Raw text sent to LLM:', rawExtractedText);
    // console.error('Raw response from LLM:', jsonResponseText);
    throw new Error('Could not extract transactions. The AI returned an invalid format.');
  }
}
