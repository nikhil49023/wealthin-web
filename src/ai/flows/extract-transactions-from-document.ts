
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document using a hybrid, two-stage approach.
 * Stage 1: A vision model performs OCR to extract raw text from the document image.
 * Stage 2: A powerful text model (Qwen Instruct) parses the raw text to extract structured transaction data.
 * This pipeline is more accurate and robust than a single-shot approach.
 */
import catalystService from '@/services/catalyst';
import type {
  ExtractTransactionsInput,
  ExtractTransactionsOutput,
  ExtractedTransaction,
} from '@/ai/schemas/transactions';
import { ExtractTransactionsOutputSchema } from '@/ai/schemas/transactions';
import { cleanAndParseJSON } from '@/lib/cleanJson';

// --- STAGE 1: Vision Model for OCR ---
// This function uses the VLM simply to "read" the document and return raw text.
async function extractTextWithVisionModel(base64Image: string): Promise<string> {
    const ocrSystemPrompt = "You are an expert at optical character recognition. Extract all text content from the provided image of a document page. Return only the raw text, preserving the layout as best as possible. Do not summarize, interpret, or format the text.";
    const ocrUserPrompt = "Extract all text from this document image.";
    
    // Using the VLM for its OCR capabilities
    const rawText = await catalystService.generateTextFromImage(ocrSystemPrompt, [base64Image], ocrUserPrompt);
    return rawText;
}


// --- STAGE 2: Text Model for Structuring ---
// This function takes raw text and uses a powerful instruction-following model to extract JSON.
async function structureTextWithLLM(rawText: string): Promise<ExtractedTransaction[]> {
  const systemPrompt = `You are an expert financial data analyst specializing in Indian financial documents. You MUST return ONLY a valid JSON array of transactions. Do not include any other text, markdown formatting (like \`\`\`json), or explanations.`;
  
  // A more detailed prompt for the text model, which is better at instruction following.
  const userPrompt = `
Analyze the following text extracted from a financial document.
Your task is to be exhaustive and extract all transactions, returning them as a valid JSON array.

Each object in the JSON array must conform to this exact schema:
{
  "description": "(string) A clear and concise description of the transaction.",
  "date": "(string) The date of the transaction. IMPORTANT: You must normalize this to YYYY-MM-DD format.",
  "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals and 'income' for credits/deposits.",
  "amount": "(number) The transaction amount as a raw number, without currency symbols or commas. Correctly parse Indian number formats (e.g., '1,23,456.78' becomes 123456.78)."
}

- For dates, always convert them to a standard YYYY-MM-DD format. For example, '03/05/24' becomes '2024-05-03'.
- The 'amount' field MUST be a raw number.
- If no transactions are found, return an empty array [].
- Be exhaustive. Do not miss any line item that looks like a transaction.

Here is the text to analyze:
---
${rawText}
---
`;

  // Use the Qwen Instruct model which is optimized for this kind of task
  const jsonResponseText = await catalystService.generateText(userPrompt, systemPrompt, "crm-di-qwen_instruct");
  
  // Use the robust cleaner to parse the response
  const parsedData = cleanAndParseJSON(jsonResponseText);

  // After cleaning, we must validate that we have an array before proceeding
  if (!Array.isArray(parsedData)) {
    console.error("Cleaned data is not an array:", parsedData);
    throw new Error("AI returned an invalid format that could not be fixed. Please try a different document.");
  }
  
  // The schema expects an object with a 'transactions' property, so we wrap the array
  const validatedData = ExtractTransactionsOutputSchema.safeParse({ transactions: parsedData });

  if (!validatedData.success) {
      console.error("Zod validation failed:", validatedData.error.errors);
      // Even if validation fails, we can try to return the successfully parsed items
      // This is a more lenient approach
      const partiallyValidData = parsedData.filter(item => {
          return 'description' in item && 'date' in item && 'type' in item && 'amount' in item;
      });
      if (partiallyValidData.length > 0) {
          console.warn("Returning partially valid data.");
          return partiallyValidData;
      }
      throw new Error(`AI returned a format with missing required fields. Zod errors: ${JSON.stringify(validatedData.error.errors)}`);
  }
  
  return validatedData.data.transactions;
}


// --- Main Flow Orchestrator ---
export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {
  try {
    const uris = Array.isArray(input.documentDataUri) ? input.documentDataUri : [input.documentDataUri];
    let allTransactions: ExtractedTransaction[] = [];
    
    // Process each document URI (e.g., each page of a PDF) individually
    for (const uri of uris) {
        const mimeTypeMatch = uri.match(/^data:(.*?);base64,/);
        if (!mimeTypeMatch) {
            console.warn("Skipping invalid data URI.");
            continue;
        }
        const base64Data = uri.split(',')[1];
        
        // STAGE 1: Extract raw text using the vision model's OCR capability
        const rawText = await extractTextWithVisionModel(base64Data);

        if (!rawText || rawText.trim().length < 10) {
            console.warn("Extracted text was empty or too short. Skipping this page.");
            continue;
        }

        // STAGE 2: Structure the extracted text using a powerful text model
        let extracted: ExtractedTransaction[] = await structureTextWithLLM(rawText);
        
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
