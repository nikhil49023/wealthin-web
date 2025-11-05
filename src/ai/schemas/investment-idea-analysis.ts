
import { z } from 'zod';

// Schemas for Investment Idea Analysis
export const GenerateInvestmentIdeaAnalysisInputSchema = z.object({
  idea: z.string().describe('The business investment idea to be analyzed.'),
});
export type GenerateInvestmentIdeaAnalysisInput = z.infer<
  typeof GenerateInvestmentIdeaAnalysisInputSchema
>;

export const GenerateInvestmentIdeaAnalysisOutputSchema = z.object({
  title: z.string().describe('The title of the business idea.'),
  summary: z.string().describe('A brief summary of the business idea.'),
  investmentStrategy: z
    .string()
    .describe(
      'A detailed investment strategy, including initial capital, equipment, and operational costs.'
    ),
  targetAudience: z
    .string()
    .describe(
      'A description of the target audience and marketing strategy for the business.'
    ),
  roi: z
    .string()
    .describe(
      'An analysis of the potential Return on Investment (ROI), including revenue projections and profitability.'
    ),
  futureProofing: z
    .string()
    .describe(
      'An analysis of the future-proofing of the business, including scalability, competition, and market trends.'
    ),
  relevantSchemes: z
    .string()
    .describe(
      'A summary of 2-3 relevant Indian government schemes or policies that could support this type of business. Include what the scheme offers and who is eligible.'
    ),
    legalRequirements: z
    .string()
    .describe(
      'A summary of the key legal and regulatory requirements for this business in India, such as registrations, licenses, and permits.'
    ),
});
export type GenerateInvestmentIdeaAnalysisOutput = z.infer<
  typeof GenerateInvestmentIdeaAnalysisOutputSchema
>;
