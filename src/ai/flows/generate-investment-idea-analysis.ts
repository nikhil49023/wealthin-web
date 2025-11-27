
'use server';

/**
 * @fileOverview A flow for generating a detailed analysis of a business idea using Firebase AI.
 * It now generates all sections, including relevant schemes, in a single call.
 */
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { app } from '@/lib/firebase';
import type {
  GenerateInvestmentIdeaAnalysisInput,
  GenerateInvestmentIdeaAnalysisOutput,
} from '@/ai/schemas/investment-idea-analysis';
import { GenerateInvestmentIdeaAnalysisOutputSchema } from '@/ai/schemas/investment-idea-analysis';

const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: 'gemini-1.5-flash-latest' });


export async function generateInvestmentIdeaAnalysis(
  input: GenerateInvestmentIdeaAnalysisInput
): Promise<GenerateInvestmentIdeaAnalysisOutput> {
  const prompt = `You are a specialized financial mentor for early-stage entrepreneurs in India.
Your task is to provide a detailed, structured, and organized analysis of the following business idea:
"${input.idea}"

Your response MUST be ONLY a valid JSON object that conforms to the following schema.
The schema is:
{
  "title": "The title of the business idea.",
  "summary": "A brief summary of the business idea. Prepend \\"*(Powered by WealthIn AI)*\\".",
  "investmentStrategy": "A detailed investment strategy, including initial capital, equipment, and operational costs. Prepend \\"*(Powered by WealthIn AI)*\\".",
  "targetAudience": "A description of the target audience and marketing strategy for the business. Prepend \\"*(Powered by WealthIn AI)*\\".",
  "roi": "An analysis of the potential Return on Investment (ROI), including revenue projections and profitability. Prepend \\"*(Powered by WealthIn AI)*\\".",
  "futureProofing": "An analysis of the future-proofing of the business, including scalability, competition, and market trends. Prepend \\"*(Powered by WealthIn AI)*\\".",
  "relevantSchemes": "A summary of 2-3 relevant Indian government schemes or policies that could support this type of business. Include what the scheme offers and who is eligible. Prepend \\"*(Powered by WealthIn AI)*\\".",
  "legalRequirements": "A summary of the key legal and regulatory requirements for this business in India, such as registrations (like GST, Udyam), licenses, and permits needed. Prepend \\"*(Powered by WealthIn AI)*\\"."
}

Do NOT include any other text, markdown, or explanations. Just the JSON object.
`;

  const { response } = await model.generateContent(prompt);

  try {
    const text = response.text();
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    
    // Validate the parsed output against the Zod schema
    return GenerateInvestmentIdeaAnalysisOutputSchema.parse(parsed);

  } catch (e) {
    console.error('Failed to parse JSON from model response:', response.text(), e);
    throw new Error('Could not generate the idea analysis. The AI returned an invalid format.');
  }
}
