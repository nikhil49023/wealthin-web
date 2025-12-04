
'use server';
/**
 * @fileOverview A flow for answering questions using the Zoho Catalyst LLM Chat endpoint.
 * It uses a centralized service to handle authentication and API calls.
 */
import { generateText } from '@/services/catalyst';
import type {
  GenerateRagAnswerInput,
  GenerateRagAnswerOutput,
} from '@/ai/schemas/rag-answer';

export async function generateRagAnswer(
  input: GenerateRagAnswerInput
): Promise<GenerateRagAnswerOutput> {
  try {
    const transactionsList = input.transactions
        ?.map(t => `- ${t.description}: ${t.amount} (${t.type}) on ${t.date}`)
        .join('\n') || 'No transaction history provided.';

    const systemPrompt = `You are a helpful financial advisor for an app named "WealthIn". Your user is an entrepreneur in India. Use the provided transaction history to give a concise, relevant, and actionable answer to the user's query. Use markdown for formatting (like **bold** and lists). ALWAYS provide a helpful answer, even if you have to give general advice when context is limited.`;

    const fullPrompt = `My question is: "${input.query}"

Here is my recent transaction history for context:
---
${transactionsList}
---
`;
    
    let answer = await generateText(fullPrompt, systemPrompt);

    if (!answer?.trim()) {
        answer = 'I apologize, but I could not generate a specific answer for that. Could you please rephrase your question or provide more details?';
    }

    return { answer: answer.trim() };
  } catch (e: any) {
    if (e.message.includes('CRITICAL RUNTIME ERROR') || e.message.includes('invalid_client')) {
        return { answer: 'The AI Advisor is temporarily unavailable due to a configuration issue. Please contact support.'};
    }
    console.error('Failed to get response from AI service:', e);
    // Return a user-friendly error message instead of throwing
    return { answer: `I'm sorry, an error occurred while trying to get your answer: ${e.message}` };
  }
}
