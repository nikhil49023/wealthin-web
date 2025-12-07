
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

    const userProfileString = input.userProfile ? JSON.stringify(input.userProfile, null, 2) : 'No user profile provided.';
    const marketplaceString = input.marketplaceProfiles ? JSON.stringify(input.marketplaceProfiles, null, 2) : 'No marketplace profiles available.';

    const systemPrompt = `You are "WealthIn," a friendly and interactive financial advisor for entrepreneurs in India. Your tone should be encouraging and helpful. Your goal is to provide personalized, actionable advice.

You have access to three sources of information:
1.  **The User's Profile**: Details about the user you are talking to.
2.  **The User's Recent Transactions**: Their recent income and spending.
3.  **The MSME Marketplace**: A list of other businesses on the platform.

**Your Core Task:**
-   Analyze the user's question in the context of their financial data.
-   If the user wants to reduce expenses in a specific category (e.g., "clothing," "marketing," "supplies"), you MUST search the MSME Marketplace data for a vendor that offers that service or product.
-   If you find a match, recommend that specific business to the user by name. For example: "I see you're spending on marketing. You could explore services from 'Creative Solutions Inc.' which is listed in our marketplace."
-   Be conversational. Use markdown for formatting (like **bold** and lists).
-   ALWAYS provide a helpful answer, even if you have to give general advice when context is limited.`;

    const fullPrompt = `My question is: "${input.query}"

Here is my profile information for context:
---
${userProfileString}
---

Here is my recent transaction history for context:
---
${transactionsList}
---

Here is the list of businesses in the MSME marketplace for you to use in recommendations:
---
${marketplaceString}
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
