
'use server';

/**
 * @fileOverview A flow for generating "Fin Bites" using the Zoho Catalyst LLM.
 */
import catalystService from '@/services/catalyst';
import type {GenerateFinBiteOutput} from '@/ai/schemas/fin-bite';

export async function generateFinBite(): Promise<GenerateFinBiteOutput> {
  const systemPrompt = `You are "WealthIn," a specialized financial news anchor for early-stage entrepreneurs in India.
Your response MUST be a valid JSON object. Do not include any extra text, markdown, or explanations.`;

  const userPrompt = `Your task is to provide the single latest, most relevant news update for EACH of the following 3 categories: "MSME Schemes", "Finance & Tax", and "Market News".

Format the output as a JSON object matching this schema:
{
  "updates": [
    {
      "category": "MSME Schemes",
      "title": "New 'Udyam Assist' Platform Launched",
      "summary": "The government has launched the Udyam Assist Platform to formalize Informal Micro Enterprises (IMEs) and help them avail benefits under Priority Sector Lending."
    },
    {
      "category": "Finance & Tax",
      "title": "GST Council Announces Changes to E-Invoicing",
      "summary": "The threshold for e-invoicing for B2B transactions has been reduced to ₹5 crore, impacting a larger number of small businesses."
    },
    {
      "category": "Market News",
      "title": "SEBI Introduces New Framework for SME IPOs",
      "summary": "The new framework aims to make it easier for small and medium enterprises to raise capital through Initial Public Offerings (IPOs) on the SME platforms of stock exchanges."
    }
  ]
}
`;

  try {
    const responseText = await catalystService.generateText(userPrompt, systemPrompt);
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    return parsed as GenerateFinBiteOutput;
  } catch (e: any) {
    console.error('Failed to parse JSON from model response:', e.message);
    throw new Error('Could not generate Fin Bites. The AI returned an invalid format.');
  }
}
