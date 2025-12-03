
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document using a hybrid, three-stage approach.
 * Stage 1: A vision model performs OCR to extract raw text from the document image.
 * Stage 2: An instruction-following model "chunks" the raw text, wrapping each transaction in a <transaction> tag.
 * Stage 3: The flow loops through each chunk and calls the model again to extract structured data from that small, specific block.
 * This pipeline is more accurate and robust than a two-stage approach, especially for dense documents.
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

// --- STAGE 2: Text Model for "Chunking" ---
// This function takes raw text and wraps each transaction in a <transaction> tag.
async function chunkTransactionsWithLLM(rawText: string): Promise<string[]> {
    const systemPrompt = `You are a text processing utility. Your task is to identify individual transaction records in the text and wrap each one within <transaction> and </transaction> tags. Return the entire text with these tags inserted. Do not remove or alter any of the original text.`;
    const userPrompt = `
Analyze the following text from a financial statement.
Identify each distinct transaction record. A transaction usually includes a date, description, and amount.
Wrap each full transaction block you find with <transaction> opening and </transaction> closing tags.

Example:
Original Text:
Nov 30, 2025
01:34 pm
Paid to SOMEONE
₹35,000
UPI/12345

Nov 29, 2025
Received from SOMEONE ELSE
₹500

Your output should be:
<transaction>
Nov 30, 2025
01:34 pm
Paid to SOMEONE
₹35,000
UPI/12345
</transaction>
<transaction>
Nov 29, 2025
Received from SOMEONE ELSE
₹500
</transaction>

Here is the text to process:
---
${rawText}
---
`;
    const taggedText = await catalystService.generateText(userPrompt, systemPrompt);
    
    // Extract content between the tags
    const chunks = taggedText.match(/<transaction>([\s\S]*?)<\/transaction>/g) || [];
    return chunks.map(chunk => chunk.replace(/<\/?transaction>/g, '').trim());
}


// --- STAGE 3: Text Model for Structuring a Single Chunk ---
// This function takes a single transaction text chunk and extracts a JSON object from it.
async function structureSingleChunkWithLLM(chunk: string): Promise<ExtractedTransaction | null> {
  const systemPrompt = `You are a data extraction expert. You MUST return ONLY a single, valid JSON object for the transaction. Do not include any other text, markdown formatting, or explanations.`;
  
  const userPrompt = `
Analyze the following transaction text.
Your task is to extract the details and return them as a single, valid JSON object.

The JSON object must conform to this exact schema:
{
  "description": "(string) A clear and concise description of the transaction.",
  "date": "(string) The date of the transaction. IMPORTANT: You must normalize this to YYYY-MM-DD format.",
  "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals/payments and 'income' for credits/deposits/receipts.",
  "amount": "(number) The transaction amount as a raw number, without currency symbols or commas. Correctly parse Indian number formats."
}

- If you cannot determine a field, omit it from the JSON.
- The 'amount' field MUST be a raw number.

Here is the transaction text to analyze:
---
${chunk}
---
`;
  const jsonResponseText = await catalystService.generateText(userPrompt, systemPrompt, "crm-di-qwen_text_14b-fp8-it");
  
  const parsedData = cleanAndParseJSON(jsonResponseText);

  // Since we expect a single object, we don't need to check for arrays
  if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
    return parsedData as ExtractedTransaction;
  }
  
  console.warn("Could not parse a valid transaction object from chunk:", chunk);
  return null;
}


// --- Main Flow Orchestrator ---
export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {
  try {
    const uris = Array.isArray(input.documentDataUri) ? input.documentDataUri : [input.documentDataUri];
    let allTransactions: ExtractedTransaction[] = [];
    
    for (const uri of uris) {
        const mimeTypeMatch = uri.match(/^data:(.*?);base64,/);
        if (!mimeTypeMatch) {
            console.warn("Skipping invalid data URI.");
            continue;
        }
        const base64Data = uri.split(',')[1];
        
        // STAGE 1: Extract raw text using OCR
        const rawText = await extractTextWithVisionModel(base64Data);

        if (!rawText || rawText.trim().length < 10) {
            console.warn("Extracted text was empty or too short. Skipping this page.");
            continue;
        }

        // STAGE 2: Chunk the raw text into individual transaction blocks
        const transactionChunks = await chunkTransactionsWithLLM(rawText);

        if (transactionChunks.length === 0) {
            console.warn("No transaction chunks were identified on this page.");
            continue;
        }
        
        // STAGE 3: Process each chunk individually
        const chunkPromises = transactionChunks.map(chunk => structureSingleChunkWithLLM(chunk));
        const extractedFromChunks = await Promise.all(chunkPromises);

        const validTransactions = extractedFromChunks.filter(
            (t): t is ExtractedTransaction => t !== null && 'description' in t && 'date' in t && 'type' in t && 'amount' in t
        );
        
        if (validTransactions.length > 0) {
            allTransactions.push(...validTransactions);
        }
    }

    if (allTransactions.length === 0) {
      throw new Error("No transactions were extracted from the document(s). The document might be empty, unreadable, or not a financial statement.");
    }

    const finalResult = { transactions: allTransactions };
    const validatedData = ExtractTransactionsOutputSchema.parse(finalResult);
    return validatedData;

  } catch (e: any) {
    console.error('Error during transaction extraction flow:', e);
    throw new Error(e.message || 'Could not extract transactions due to an unexpected error.');
  }
}
