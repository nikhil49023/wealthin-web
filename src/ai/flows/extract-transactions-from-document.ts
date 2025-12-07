
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document.
 * It uses different strategies based on the file type (PDF vs. Image).
 */
import { generateText, generateTextFromImage } from '@/services/catalyst';
import type {
  ExtractTransactionsInput,
  ExtractTransactionsOutput,
  ExtractedTransaction,
} from '@/ai/schemas/transactions';
import { ExtractTransactionsOutputSchema } from '@/ai/schemas/transactions';
import { cleanAndParseJSON } from '@/lib/cleanJson';
import pdf from 'pdf-parse';

// --- Stage 1, Option A: Vision Model for Image OCR ---
async function extractTextWithVision(base64Image: string): Promise<string> {
    const ocrSystemPrompt = "You are an expert at optical character recognition. Extract all text content from the provided image of a document page. Return only the raw text, preserving the layout as best as possible. Do not summarize, interpret, or format the text.";
    const ocrUserPrompt = "Extract all text from this document image.";
    const rawText = await generateTextFromImage(ocrUserPrompt, [base64Image], ocrSystemPrompt);
    return rawText;
}

// --- Stage 1, Option B: Direct Text Extraction for PDF ---
async function extractTextFromPdf(dataUri: string): Promise<string> {
    const base64Data = dataUri.split(',')[1];
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    const data = await pdf(pdfBuffer);
    return data.text;
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
    const jsonResponseText = await generateText(userPrompt, systemPrompt, "crm-di-qwen_text_14b-fp8-it");
    return cleanAndParseJSON(jsonResponseText);
}


// --- Main Flow Orchestrator ---
export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {
  try {
    const { documentDataUri, mimeType } = input;
    let rawText: string;

    // STAGE 1: Extract raw text based on file type
    if (mimeType.startsWith('image/')) {
        const base64Data = documentDataUri.split(',')[1];
        rawText = await extractTextWithVision(base64Data);
    } else if (mimeType === 'application/pdf') {
        rawText = await extractTextFromPdf(documentDataUri);
    } else {
        throw new Error(`Unsupported file type: ${mimeType}. Please upload a PDF or an image.`);
    }

    if (!rawText || rawText.trim().length < 10) {
        throw new Error("Could not extract any readable text from the document. It might be empty, corrupted, or an image-only PDF that requires OCR.");
    }

    // STAGE 2: Structure the raw text into JSON
    const extractedData = await structureTextWithLLM(rawText);
    
    if (!Array.isArray(extractedData) || extractedData.length === 0) {
        throw new Error("AI could not find any transactions in the document. Please ensure it is a financial statement.");
    }

    // Final validation against the Zod schema
    const finalResult = { transactions: extractedData as ExtractedTransaction[] };
    const validatedData = ExtractTransactionsOutputSchema.parse(finalResult);
    return validatedData;

  } catch (e: any) {
    if (e.message.includes('CRITICAL RUNTIME ERROR') || e.message.includes('invalid_client') || e.message.includes('Internal Server Error')) {
       throw new Error('AI features are temporarily unavailable due to a configuration issue. Please contact support.');
    }
    console.error('Error during transaction extraction flow:', e);
    // If it's a Zod validation error, the message will be more informative
    const errorMessage = e.errors ? JSON.stringify(e.errors, null, 2) : e.message;
    throw new Error(`Could not extract transactions. ${errorMessage}`);
  }
}
