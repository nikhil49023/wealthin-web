
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
  
  const userPrompt = `Please provide a comprehensive analysis for the following business idea: "${input.idea}"

Structure your response as a valid JSON object that conforms to the schema below. Each section should be detailed, well-structured, and provide actionable insights for an entrepreneur.

{
  "title": "A concise and professional title for the business idea.",
  "summary": "A brief, compelling summary of the business concept, its value proposition, and target market.",
  "investmentStrategy": "A detailed breakdown of the required investment. Include estimated initial capital for equipment, setup, licenses, and initial marketing. Also, estimate the monthly operational costs (working capital).",
  "targetAudience": "A clear description of the primary and secondary target audience. Include a practical marketing and sales strategy to reach these customers.",
  "roi": "A realistic analysis of the potential Return on Investment (ROI). Include projected revenue streams, key profitability drivers, and an estimated timeline to break even and achieve profitability.",
  "futureProofing": "An analysis of the business's long-term viability. Discuss potential for scalability, how to handle competition, and strategies to adapt to future market trends.",
  "relevantSchemes": "A summary of 2-3 specific and relevant Indian government schemes or policies that could support this business. For each scheme, briefly explain the benefits (e.g., subsidy, loan) and eligibility criteria.",
  "legalRequirements": "A summary of the key legal and regulatory requirements for starting this business in India. Include necessary registrations (like GST, Udyam), licenses, and permits."
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
