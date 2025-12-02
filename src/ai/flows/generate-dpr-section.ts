'use server';

import catalystService from '@/services/catalyst';
import type { GenerateDprSectionInput, GenerateDprSectionOutput } from '@/ai/schemas/dpr';
import { FinancialProjectionsSchema } from '@/ai/schemas/dpr';
import { cleanAndParseJSON } from '@/lib/cleanJson';

export async function generateDprSection(
  input: GenerateDprSectionInput
): Promise<GenerateDprSectionOutput> {

  const systemPrompt = `You are an expert consultant hired to write a bank-ready Detailed Project Report (DPR) for an MSME in India.
You will be given user-provided data in a JSON format about the business idea.
Your task is to generate the content for ONLY ONE specific section of the DPR.
All financial figures should be in Indian Rupees (INR).
Generate detailed, professional, and well-structured content for the section.`;
  
  // Replace the placeholder with the stringified idea data
  const finalUserMessage = input.basePrompt.replace('{{idea}}', JSON.stringify(input.idea));

  try {
    const responseText = await catalystService.generateText(finalUserMessage, systemPrompt);
    const parsedJson = cleanAndParseJSON(responseText);
    
    // For the financial section, the AI returns the object directly. We wrap it for consistency.
    if (input.section === 'financialProjections') {
      const validatedData = FinancialProjectionsSchema.parse(parsedJson);
      // The component expects the full object, not nested under 'content'
      return validatedData as any;
    }

    // For other sections, the AI is asked to return { "content": "..." }
    if (parsedJson && typeof parsedJson === 'object' && 'content' in parsedJson) {
      return { content: parsedJson.content };
    } else {
      // Fallback if the AI returns a raw string or unexpected object
      return { content: JSON.stringify(parsedJson) };
    }
  } catch (e: any) {
    console.error(`Failed to generate or parse DPR section "${input.section}" from AI:`, e.message);
    throw new Error(`Failed to generate the section. The AI returned an unrecoverable format or an error occurred: ${e.message}`);
  }
}
