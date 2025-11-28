
'use server';

/**
 * @fileOverview A flow for generating a detailed analysis of a business idea using the Zoho Catalyst LLM.
 * This flow now only generates the title and summary. The individual sections are handled by generate-idea-section.
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
  const systemPrompt = `You are a specialized financial mentor. Your response MUST be ONLY a valid JSON object with "title" and "summary" keys. Do NOT include any other text, markdown, or explanations.`;
  
  const userPrompt = `Please provide a concise and professional "title" and a brief, compelling "summary" for the following business idea: "${input.idea}"

Structure your response as a valid JSON object:
{
  "title": "A concise and professional title for the business idea.",
  "summary": "A brief, compelling summary of the business concept, its value proposition, and target market."
}
`;

  try {
    const responseText = await catalystService.generateText(userPrompt, systemPrompt);
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    
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
    console.error('Failed to parse JSON from model response:', e);
    throw new Error('Could not generate the idea analysis. The AI returned an invalid format.');
  }
}
