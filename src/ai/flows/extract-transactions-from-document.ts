
'use server';
/**
 * @fileOverview A flow for extracting financial transactions from a document.
 * This flow now uses the Zoho Catalyst LLM service to parse a document and return structured data.
 * NOTE: The Catalyst LLM does not support direct file/image uploads in the same way.
 * This prompt assumes the user will paste the text content of the document.
 * A more robust solution would involve OCR pre-processing.
 */
import catalystService from '@/services/catalyst';
import type {
  ExtractTransactionsInput,
  ExtractTransactionsOutput,
} from '@/ai/schemas/transactions';

export async function extractTransactionsFromDocument(
  input: ExtractTransactionsInput
): Promise<ExtractTransactionsOutput> {

  // The new model doesn't directly support data URIs for files.
  // We'll operate on the assumption that a text representation of the document is being passed.
  // This is a limitation of the new API vs the old one. We'll extract text from the data URI.
  let documentTextContent: string;
  try {
      const base64Content = input.documentDataUri.split(',')[1];
      documentTextContent = Buffer.from(base64Content, 'base64').toString('utf-8');
  } catch (e) {
      documentTextContent = "Could not decode document content. Assume it's plain text."
  }


  const systemPrompt = `You are an expert at extracting structured data. Your response MUST be ONLY a valid JSON object that conforms to the specified schema. Do NOT include any other text, markdown, or explanations.`;

  const userPrompt = `Analyze the provided financial document content and extract all financial transactions you can find.

For each transaction, provide:
- "description": A clear description of the transaction.
- "date": The date in DD/MM/YYYY format.
- "type": "income" or "expense".
- "amount": The transaction amount, formatted as a string with currency (e.g., "INR 1,234.56").

Your response must be a JSON object with a single key "transactions" containing an array of these objects.

Document Content:
---
${documentTextContent}
---
`;

  try {
    const responseText = await catalystService.generateText(userPrompt, systemPrompt);
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    return parsed as ExtractTransactionsOutput;
  } catch (e) {
    console.error('Failed to parse JSON from model response:', e);
    throw new Error('Could not extract transactions. The AI returned an invalid format.');
  }
}
