
'use server';

/**
 * @fileOverview A flow for generating a detailed analysis of a business idea using the Zoho Catalyst LLM.
 * This flow now only generates the title and summary. The individual sections are handled by generate-idea-section.
 */
import { generateText } from '@/services/catalyst';
import type {
  GenerateInvestmentIdeaAnalysisInput,
  GenerateInvestmentIdeaAnalysisOutput,
} from '@/ai/schemas/investment-idea-analysis';
import { GenerateInvestmentIdeaAnalysisOutputSchema } from '@/ai/schemas/investment-idea-analysis';
import { cleanAndParseJSON } from '@/lib/cleanJson';

export async function generateInvestmentIdeaAnalysis(
  input: GenerateInvestmentIdeaAnalysisInput
): Promise<GenerateInvestmentIdeaAnalysisOutput> {
  const transactionsList = input.transactions
    ?.map(t => `- ${t.description}: ${t.amount} (${t.type}) on ${t.date}`)
    .join('\n') || 'No transaction history provided.';

  const systemPrompt = `You are a specialized financial mentor. Your response MUST be ONLY a valid JSON object with "title" and "summary" keys. Do NOT include any other text, markdown, or explanations.`;
  
  const userPrompt = `Please provide a concise and professional "title" and a brief, compelling "summary" for the following business idea: "${input.idea}"

Also consider the user's recent transactions when framing the summary:
---
${transactionsList}
---

Structure your response as a valid JSON object:
{
  "title": "A concise and professional title for the business idea.",
  "summary": "A brief, compelling summary of the business concept, its value proposition, and target market. Subtly incorporate insights from the user's financial context if relevant."
}
`;

  try {
    const responseText = await generateText(userPrompt, systemPrompt);
    const parsed = cleanAndParseJSON(responseText);
    
    // We only expect title and summary here. The rest will be populated by the sectional generator.
    const partialSchema = GenerateInvestmentIdeaAnalysisOutputSchema.pick({ title: true, summary: true });
    const validatedData = partialSchema.parse(parsed);

    // Return a full object with empty strings for other fields to match the type
    return {
      title: validatedData.title,
      summary: validatedData.summary,
      investmentStrategy: '',
      targetAudience: '',
      roi: '',
      futureProofing: '',
      relevantSchemes: '',
      legalRequirements: '',
    };

  } catch (e: any) {
    if (e.message.includes('CRITICAL RUNTIME ERROR') || e.message.includes('invalid_client')) {
       throw new Error('AI features are temporarily unavailable due to a configuration issue. Please contact support.');
    }
    console.error('Failed to parse JSON from model response:', e);
    throw new Error('Could not generate the idea analysis. The AI returned an invalid format.');
  }
}
