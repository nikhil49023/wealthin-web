
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document using a two-stage pipeline.
 * Stage 1: A vision model performs OCR to extract raw text.
 * Stage 2: An instruction-following text model structures the data from the raw text.
 */
import catalystService from '@/services/catalyst';
import type {
  ExtractTransactionsInput,
  ExtractTransactionsOutput,
  ExtractedTransaction,
} from '@/ai/schemas/transactions';
import { ExtractTransactionsOutputSchema } from '@/ai/schemas/transactions';
import { cleanAndParseJSON } from '@/lib/cleanJson';

// --- Stage 1: Vision Model for OCR ---
async function extractTextWithVisionModel(base64Image: string): Promise<string> {
    const ocrSystemPrompt = "You are an expert at optical character recognition. Extract all text content from the provided image of a document page. Return only the raw text, preserving the layout as best as possible. Do not summarize, interpret, or format the text.";
    const ocrUserPrompt = "Extract all text from this document image.";
    const rawText = await catalystService.generateTextFromImage(ocrSystemPrompt, [base64Image], ocrUserPrompt);
    return rawText;
}

// --- Stage 2: Text Model for Structuring ---
async function structureTextWithLLM(rawText: string): Promise<any> {
    const systemPrompt = `You are an expert financial analyst. Your task is to exhaustively extract all transactions from the provided text. You MUST return ONLY a valid JSON array of transaction objects. Do not include any other text, markdown, or explanations.`;
    const userPrompt = `
Analyze the following text from a financial statement and extract all transactions.
Each transaction object in the JSON array must conform to this exact schema:
{
  "description": "(string) A clear and concise description of the transaction.",
  "date": "(string) The date of the transaction. IMPORTANT: You must normalize this to YYYY-MM-DD format.",
  "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals/payments and 'income' for credits/deposits/receipts.",
  "amount": "(number) The transaction amount as a raw number, without currency symbols or commas. Correctly parse Indian number formats (e.g., '1,00,000' should be 100000)."
}

Here is the text to process:
---
${rawText}
---
`;
    // Using a powerful instruction-following model for this task.
    const jsonResponseText = await catalystService.generateText(userPrompt, systemPrompt, "crm-di-qwen_text_14b-fp8-it");
    return cleanAndParseJSON(jsonResponseText);
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
            console.warn("Extracted text was empty or too short. Skipping this document/page.");
            continue;
        }

        // STAGE 2: Structure the raw text into JSON
        const extractedData = await structureTextWithLLM(rawText);
        
        // Ensure the output is an array before trying to spread it
        if (Array.isArray(extractedData)) {
            allTransactions.push(...(extractedData as ExtractedTransaction[]));
        } else {
            console.warn("AI did not return a valid array of transactions. Output:", extractedData);
        }
    }

    if (allTransactions.length === 0) {
      throw new Error("No transactions were extracted from the document(s). The document might be empty, unreadable, or not a financial statement.");
    }

    // Final validation against the Zod schema
    const finalResult = { transactions: allTransactions };
    const validatedData = ExtractTransactionsOutputSchema.parse(finalResult);
    return validatedData;

  } catch (e: any) {
    if (e.message.includes('CRITICAL RUNTIME ERROR') || e.message.includes('invalid_client')) {
       throw new Error('AI features are temporarily unavailable due to a configuration issue. Please contact support.');
    }
    console.error('Error during transaction extraction flow:', e);
    // If it's a Zod validation error, the message will be more informative
    const errorMessage = e.errors ? JSON.stringify(e.errors, null, 2) : e.message;
    throw new Error(`Could not extract transactions. ${errorMessage}`);
  }
}
