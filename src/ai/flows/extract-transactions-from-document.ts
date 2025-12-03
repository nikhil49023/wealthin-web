
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
  // Enhanced system prompt for robustness
  const vlmSystemPrompt = `You are an expert financial data analyst specializing in Indian financial documents. You MUST return ONLY a valid JSON array of transactions. Do not include any other text, markdown formatting (like \`\`\`json), or explanations.`;

  // Enhanced user prompt with clearer schema instructions
  const vlmUserPrompt = `
Analyze the provided image of a financial document (like a bank statement page or receipt).
Your task is to be exhaustive and extract all transactions, returning them as a valid JSON array.

Each object in the JSON array must conform to this exact schema:
{
  "description": "(string) A clear and concise description of the transaction.",
  "date": "(string) The date of the transaction. IMPORTANT: You must normalize this to YYYY-MM-DD format.",
  "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals and 'income' for credits/deposits.",
  "amount": "(number) The transaction amount as a raw number, without currency symbols or commas. Correctly parse Indian number formats (e.g., '1,23,456.78' becomes 123456.78).",
  "category": "(string, optional) Categorize the transaction into one of the following: 'Food', 'Transport', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Health', 'Rent', 'Salary', or 'Other'."
}

- For dates, always convert them to a standard YYYY-MM-DD format. For example, '03/05/24' becomes '2024-05-03'.
- The 'amount' field MUST be a raw number.
- If a clear category cannot be determined, you may omit the 'category' field entirely.
- If no transactions are found, return an empty array [].
- Be exhaustive. Do not miss any line item that looks like a transaction.
`;

  const jsonResponseText = await catalystService.generateTextFromImage(vlmSystemPrompt, [base64Image], vlmUserPrompt);
  
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
