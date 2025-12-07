
import { z } from 'zod';
import { ExtractedTransactionSchema } from './transactions';

// A simplified schema for the user profile to be passed to the AI
const UserProfileForAISchema = z.object({
  displayName: z.string().nullable(),
  role: z.enum(['individual', 'msme']),
  msmeName: z.string().optional(),
  msmeService: z.string().optional(),
  msmeLocation: z.string().optional(),
}).passthrough(); // Allow other fields

// A simplified schema for MSME marketplace profiles
const MarketplaceProfileSchema = z.object({
  displayName: z.string().nullable(),
  msmeName: z.string().optional(),
  msmeService: z.string().optional(),
  msmeLocation: z.string().optional(),
}).passthrough();


export const GenerateRagAnswerInputSchema = z.object({
  query: z.string().describe("The user's financial question."),
  transactions: z
    .array(ExtractedTransactionSchema)
    .optional()
    .describe('An optional array of user transactions to provide as context.'),
  userProfile: UserProfileForAISchema.optional().describe('The profile of the user asking the question.'),
  marketplaceProfiles: z.array(MarketplaceProfileSchema).optional().describe('A list of all MSME profiles from the marketplace.'),
});
export type GenerateRagAnswerInput = z.infer<typeof GenerateRagAnswerInputSchema>;

export const GenerateRagAnswerOutputSchema = z.object({
  answer: z
    .string()
    .describe("A simple, crisp, and concise response to the user's query."),
});
export type GenerateRagAnswerOutput = z.infer<typeof GenerateRagAnswerOutputSchema>;
