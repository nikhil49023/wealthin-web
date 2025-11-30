
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document using a hybrid approach.
 * It uses a text model for text-based documents (PDF, TXT) and a vision model for images.
 */
import catalystService from '@/services/catalyst';
import type {
  ExtractTransactionsInput,
  ExtractTransactionsOutput,
} from '@/ai/schemas/transactions';
import { ExtractTransactionsOutputSchema } from '@/ai/schemas/transactions';
import { cleanAndParseJSON } from '@/lib/cleanJson';
import pdf from 'pdf-parse';

async function processWithVisionModel(base64Images: string[]): Promise<ExtractTransactionsOutput> {
  const vlmSystemPrompt = `You are an expert financial data analyst. You MUST return ONLY a valid JSON object. Do not include any other text, markdown formatting (like \`\`\`json), or explanations.`;

  const vlmUserPrompt = `
Analyze the provided image(s) of a financial document (like a bank statement or transaction list).
Your task is to extract all transactions and return them as a valid JSON object.

The JSON object must conform to this exact schema:
{
  "transactions": [
    {
      "description": "(string) A clear description of the transaction.",
      "date": "(string) The date of the transaction, extracted exactly as it appears in the document.",
      "time": "(string, optional) The time of the transaction if available, extracted exactly as it appears.",
      "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals and 'income' for credits/deposits.",
      "amount": "(number) The transaction amount as a raw number, without any currency symbols or commas."
    }
  ]
}

- The 'date' and 'time' fields MUST be strings containing the values exactly as seen in the document. Do not reformat them.
- If no time is available for a transaction, omit the 'time' field.
- The 'amount' field MUST be a raw number (e.g., 1234.56).
`;

  const jsonResponseText = await catalystService.generateTextFromImage(vlmUserPrompt, base64Images, vlmSystemPrompt);
  const parsedData = cleanAndParseJSON(jsonResponseText);
  return ExtractTransactionsOutputSchema.parse(parsedData);
}

async function processWithTextModel(text: string): Promise<ExtractTransactionsOutput> {
  const textSystemPrompt = `You are an expert financial data analyst. Your response MUST be ONLY a valid JSON object. Do NOT include any other text, markdown, or explanations.`;
  
  const textUserPrompt = `
Analyze the provided text from a financial document. Your task is to extract all transactions and return them as a valid JSON object.

The JSON object must conform to this exact schema:
{
  "transactions": [
    {
      "description": "(string) A clear description of the transaction.",
      "date": "(string) The date of the transaction, extracted exactly as it appears in the document.",
      "time": "(string, optional) The time of the transaction if available, extracted exactly as it appears.",
      "type": "(string) Must be either 'income' or 'expense'. Infer 'expense' for debits/withdrawals and 'income' for credits/deposits.",
      "amount": "(number) The transaction amount as a raw number, without any currency symbols or commas."
    }
  ]
}

- The 'date' and 'time' fields MUST be strings containing the values exactly as seen in the document. Do not reformat them.
- If no time is available for a transaction, omit the 'time' field.
- The 'amount' field MUST be a raw number (e.g., 1234.56).

Here is the document text to analyze:
---
${text}
---
`;

  const jsonResponseText = await catalystService.generateText(textUserPrompt, textSystemPrompt);
  const parsedData = cleanAndParseJSON(jsonResponseText);
  return ExtractTransactionsOutputSchema.parse(parsedData);
}

export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {
  try {
    const uris = Array.isArray(input.documentDataUri) ? input.documentDataUri : [input.documentDataUri];
    
    // Determine the processing strategy
    const firstMimeType = uris[0].match(/^data:(.*?);base64,/)?.[1] || '';

    let result;

    if (firstMimeType.startsWith('image/')) {
        // If the first file is an image, treat all files as images for the VLM
        const base64Images = uris.map(uri => uri.split(',')[1]);
        result = await processWithVisionModel(base64Images);
    } else {
        // Otherwise, process as text-based documents (PDF, TXT, CSV)
        let combinedText = '';
        for (const uri of uris) {
            const mimeTypeMatch = uri.match(/^data:(.*?);base64,/);
             if (!mimeTypeMatch) {
                console.warn("Skipping invalid data URI in text-based processing.");
                continue;
            }
            const mimeType = mimeTypeMatch[1];
            const base64Data = uri.split(',')[1];
            
            if (mimeType.includes('pdf')) {
                const pdfBuffer = Buffer.from(base64Data, 'base64');
                const data = await pdf(pdfBuffer);
                combinedText += data.text + '\n\n';
            } else { // Handles text/plain, text/csv, etc.
                const textBuffer = Buffer.from(base64Data, 'base64');
                combinedText += textBuffer.toString('utf-8') + '\n\n';
            }
        }
        result = await processWithTextModel(combinedText);
    }

    if (!result || !result.transactions || result.transactions.length === 0) {
      throw new Error("No transactions were extracted from the document(s). The document might be empty, unreadable, or not a financial statement.");
    }

    const validatedData = ExtractTransactionsOutputSchema.parse(result);
    return validatedData;

  } catch (e: any) {
    console.error('Error during transaction extraction flow:', e.message);
    throw new Error(e.message || 'Could not extract transactions. The AI returned an invalid format or the document content was unparsable.');
  }
}
