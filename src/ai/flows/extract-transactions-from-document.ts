
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document.
 * It uses different strategies based on the file type (PDF vs. Image) and
 * processes multi-page PDFs in batches to handle larger documents.
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
async function extractTextWithVision(base64Image: string): Promise<string[]> {
    const ocrSystemPrompt = "You are an expert at optical character recognition. Extract all text content from the provided image of a document page. Return only the raw text, preserving the layout as best as possible. Do not summarize, interpret, or format the text.";
    const ocrUserPrompt = "Extract all text from this document image.";
    const rawText = await generateTextFromImage(ocrUserPrompt, [base64Image], ocrSystemPrompt);
    return [rawText]; // Return as an array with a single page
}

// --- Stage 1, Option B: Direct Text Extraction for PDF ---
async function extractTextFromPdf(dataUri: string): Promise<string[]> {
    const base64Data = dataUri.split(',')[1];
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    const data = await pdf(pdfBuffer);
    
    // The `pdf` function from `pdf-parse` resolves with an object containing the text of all pages.
    // The text property contains all text from the PDF, with pages often separated by form feed characters.
    // We split by this character to get an array of page texts and filter out empty pages.
    return data.text.split(/\f/g).filter(text => text.trim().length > 10);
}


// --- Stage 2: Text Model for Structuring ---
async function structureTextWithLLM(rawText: string): Promise<ExtractedTransaction[]> {
    // Truncate the text to avoid exceeding payload or context limits.
    const truncatedText = rawText.substring(0, 24000);

    const systemPrompt = `You are an expert financial analyst. Your task is to exhaustively extract all transactions from the provided text. You MUST return ONLY a valid JSON array of transaction objects. Do not include any other text, markdown, or explanations.`;
    const userPrompt = `
Analyze the following text from a financial statement and extract all transactions.
Each transaction object in the JSON array must conform to this exact schema:
{
  "description": "(string) A clear and concise description of the transaction.",
  "date": "(string) The date of the transaction. IMPORTANT: You must normalize this to YYYY-MM-DD format.",
  "time": "(string, optional) The time of the transaction, extracted exactly as it appears in the document.",
  "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals/payments and 'income' for credits/deposits/receipts.",
  "amount": "(number) The transaction amount as a raw number, without currency symbols or commas. Correctly parse Indian number formats (e.g., '1,00,000' should be 100000)."
}

Here is the text to process:
---
${truncatedText}
---
`;
    const jsonResponseText = await generateText(userPrompt, systemPrompt, "crm-di-qwen_text_14b-fp8-it");
    const parsedData = cleanAndParseJSON(jsonResponseText);
    return Array.isArray(parsedData) ? parsedData as ExtractedTransaction[] : [];
}


// --- Stage 3: Deduplication ---
function removeDuplicates(transactions: ExtractedTransaction[]): ExtractedTransaction[] {
    const seen = new Set<string>();
    return transactions.filter(transaction => {
        // Create a unique key for each transaction. Include time if available for better accuracy.
        const key = `${transaction.date}|${transaction.time || ''}|${transaction.description.toLowerCase()}|${transaction.amount}`;
        if (seen.has(key)) {
            return false; // It's a duplicate
        } else {
            seen.add(key);
            return true; // It's unique
        }
    });
}


// --- Main Flow Orchestrator ---
export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {
  let allExtractedTransactions: ExtractedTransaction[] = [];
  let pageTexts: string[] = [];
  
  try {
    const { documentDataUri, mimeType } = input;

    // STAGE 1: Extract raw text from all pages
    if (mimeType.startsWith('image/')) {
        pageTexts = await extractTextWithVision(documentDataUri);
    } else if (mimeType === 'application/pdf') {
        pageTexts = await extractTextFromPdf(documentDataUri);
    } else {
        throw new Error(`Unsupported file type: ${mimeType}. Please upload a PDF or an image.`);
    }

    if (pageTexts.length === 0 || pageTexts.every(p => p.trim().length < 10)) {
        throw new Error("Could not extract any readable text from the document. It might be empty, corrupted, or an image-only PDF.");
    }

    // STAGE 2: Process each page's text with the LLM
    for (const text of pageTexts) {
        if (text.trim().length > 10) {
            const pageTransactions = await structureTextWithLLM(text);
            allExtractedTransactions.push(...pageTransactions);
        }
    }
    
    if (allExtractedTransactions.length === 0) {
        throw new Error("AI could not find any transactions in the document. Please ensure it is a financial statement.");
    }

    // STAGE 3: Deduplicate all transactions found across all pages
    const uniqueTransactions = removeDuplicates(allExtractedTransactions);

    // Final validation against the Zod schema
    const finalResult = { transactions: uniqueTransactions };
    const validatedData = ExtractTransactionsOutputSchema.parse(finalResult);
    return validatedData;

  } catch (e: any) {
    if (e.message.includes('CRITICAL RUNTIME ERROR') || e.message.includes('invalid_client') || e.message.includes('Internal Server Error')) {
       throw new Error('AI features are temporarily unavailable due to a configuration issue. Please contact support.');
    }
    if (e.message.includes('Bad Request')) {
      throw new Error(
        'The document could not be processed. Please check the quality of the PDF. It may be a scanned image without readable text.'
      );
    }
    console.error('Error during transaction extraction flow:', e);
    
    const errorMessage = e.errors ? JSON.stringify(e.errors, null, 2) : e.message;
    throw new Error(`Could not extract transactions. ${errorMessage}`);
  }
}
