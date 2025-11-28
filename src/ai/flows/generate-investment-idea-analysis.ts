
'use server';

/**
 * @fileOverview A flow for generating a detailed analysis of a business idea using the Zoho Catalyst LLM.
 */
import catalystService from '@/services/catalyst';
import type {
  GenerateInvestmentIdeaAnalysisInput,
  GenerateInvestmentIdeaAnalysisOutput,
} from '@/ai/schemas/investment-idea-analysis';
import { GenerateInvestmentIdeaAnalysisOutputSchema } from '@/ai/schemas/investment-idea-analysis';

export async function generateInvestmentIdeaAnalysis(
  input: GenerateInvestmentIdeaAnalysisInput
): Promise<GenerateInvestmentIdeaAnalysisOutput> {
  const systemPrompt = `You are a specialized financial mentor for early-stage entrepreneurs in India. Your response MUST be ONLY a valid JSON object that conforms to the specified schema. Do NOT include any other text, markdown, or explanations. Just the JSON object.`;
  
  const userPrompt = `Please analyze the following business idea: "${input.idea}"

And structure your response according to this JSON schema exactly. Ensure the "summary", "investmentStrategy", "targetAudience", "roi", "futureProofing", "relevantSchemes", and "legalRequirements" fields are all prepended with "(Powered by WealthIn AI)".

{
  "title": "The title of the business idea.",
  "summary": "(Powered by WealthIn AI) A brief summary of the business idea.",
  "investmentStrategy": "(Powered by WealthIn AI) A detailed investment strategy, including initial capital, equipment, and operational costs.",
  "targetAudience": "(Powered by WealthIn AI) A description of the target audience and marketing strategy for the business.",
  "roi": "(Powered by WealthIn AI) An analysis of the potential Return on Investment (ROI), including revenue projections and profitability.",
  "futureProofing": "(Powered by WealthIn AI) An analysis of the future-proofing of the business, including scalability, competition, and market trends.",
  "relevantSchemes": "(Powered by WealthIn AI) A summary of 2-3 relevant Indian government schemes or policies that could support this type of business. Include what the scheme offers and who is eligible.",
  "legalRequirements": "(Powered by WealthIn AI) A summary of the key legal and regulatory requirements for this business in India, such as registrations (like GST, Udyam), licenses, and permits needed."
}
`;

  try {
    const responseText = await catalystService.generateText(userPrompt, systemPrompt);
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    
    // Validate the parsed output against the Zod schema
    return GenerateInvestmentIdeaAnalysisOutputSchema.parse(parsed);

  } catch (e: any) {
    console.error('Failed to parse JSON from model response:', e);
    throw new Error('Could not generate the idea analysis. The AI returned an invalid format.');
  }
}
