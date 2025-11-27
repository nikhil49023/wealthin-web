
'use server';

/**
 * @fileOverview A flow for generating "Fin Bites" using Firebase AI.
 */
import {initializeApp, getApps} from 'firebase/app';
import {getAI, getGenerativeModel, GoogleAIBackend} from 'firebase/ai';
import {app} from '@/lib/firebase';
import type {GenerateFinBiteOutput} from '@/ai/schemas/fin-bite';

const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, {model: 'gemini-1.5-flash-latest'});

export async function generateFinBite(): Promise<GenerateFinBiteOutput> {
  const prompt = `You are "WealthIn," a specialized financial news anchor for early-stage entrepreneurs in India.
Your task is to provide the single latest, most relevant news update for EACH of the following 3 categories: "MSME Schemes", "Finance & Tax", and "Market News".

Your response MUST be a valid JSON object. Do not include any extra text, markdown, or explanations.

Example Output:
\`\`\`json
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
\`\`\`
`;

  const {response} = await model.generateContent(prompt);

  try {
    const text = response.text();
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    return parsed as GenerateFinBiteOutput;
  } catch (e) {
    console.error('Failed to parse JSON from model response:', response.text());
    throw new Error('Could not generate Fin Bites. The AI returned an invalid format.');
  }
}
