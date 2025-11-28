
'use server';
/**
 * @fileOverview A flow for answering questions using the Zoho Catalyst LLM Chat endpoint.
 * It uses a centralized service to handle authentication and API calls.
 */
import catalystService from '@/services/catalyst';
import type {
  GenerateRagAnswerInput,
  GenerateRagAnswerOutput,
} from '@/ai/schemas/rag-answer';

export async function generateRagAnswer(
  input: GenerateRagAnswerInput
): Promise<GenerateRagAnswerOutput> {
  try {
    // Construct the prompt for the new llm/chat endpoint
    const transactionsList = input.transactions
        ?.map(t => `- ${t.description}: ${t.amount} (${t.type}) on ${t.date}`)
        .join('\n') || 'No transactions provided.';

    const systemPrompt = `You are a helpful financial advisor named WealthIn. Your user is an entrepreneur in India. Use the provided transaction history to give a concise, relevant, and actionable answer to the user's query. Use markdown for formatting.`;

    const fullPrompt = `
User Query: "${input.query}"

Recent User Transactions (for context):
---
${transactionsList}
---

Your Answer:
`;
    
    const answer = await catalystService.generateText(fullPrompt, systemPrompt);

    if (!answer) {
      throw new Error('Received empty or malformed content from the AI service.');
    }

    return { answer };
  } catch (e: any) {
    console.error('Failed to get response from AI service:', e);
    throw new Error(`An error occurred while processing the AI response: ${e.message}`);
  }
}
