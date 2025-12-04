
'use server';

/**
 * @fileOverview A flow for generating "Fin Bites" using the Zoho Catalyst LLM.
 */
import { generateText } from '@/services/catalyst';
import type {GenerateFinBiteOutput} from '@/ai/schemas/fin-bite';
import { GenerateFinBiteOutputSchema } from '@/ai/schemas/fin-bite';

export async function generateFinBite(): Promise<GenerateFinBiteOutput> {
  const systemPrompt = `You are "WealthIn," a specialized financial news anchor for early-stage entrepreneurs in India.
Your response MUST be ONLY a valid JSON object that conforms to the specified schema. Do not include any extra text, markdown, or explanations.`;

  const userPrompt = `Your task is to provide the single latest, most relevant news update for EACH of the following 3 categories: "MSME Schemes", "Finance & Tax", and "Market News".

Format the output as a JSON object matching this schema exactly:
{
  "updates": [
    {
      "category": "(string) The category of the news (e.g., 'MSME Schemes')",
      "title": "(string) The headline of the news update.",
      "summary": "(string) A brief, easy-to-understand summary of the news."
    },
    ...
  ]
}

Provide one update for each of the three categories.
`;

  try {
    const responseText = await generateText(userPrompt, systemPrompt);
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    return GenerateFinBiteOutputSchema.parse(parsed);
  } catch (e: any) {
    if (e.message.includes('CRITICAL RUNTIME ERROR') || e.message.includes('invalid_client')) {
       throw new Error('AI features are temporarily unavailable due to a configuration issue. Please contact support.');
    }
    console.error('Failed to parse JSON from model response:', e.message);
    throw new Error('Could not generate Fin Bites. The AI returned an invalid format.');
  }
}
