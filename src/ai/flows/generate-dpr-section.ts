'use server';

import catalystService from '@/services/catalyst';
import type { GenerateDprSectionInput, GenerateDprSectionOutput } from '@/ai/schemas/dpr';
import { FinancialProjectionsSchema } from '@/ai/schemas/dpr';
import { cleanAndParseJSON } from '@/lib/cleanJson';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function generateDprSection(
  input: GenerateDprSectionInput
): Promise<GenerateDprSectionOutput> {

  let finalUserMessage = input.basePrompt.replace('{{idea}}', JSON.stringify(input.idea));
  let systemPrompt = `You are an expert consultant hired to write a bank-ready Detailed Project Report (DPR) for an MSME in India.
You will be given user-provided data in a JSON format about the business idea.
Your task is to generate the content for ONLY ONE specific section of the DPR.
All financial figures should be in Indian Rupees (INR).
Generate detailed, professional, and well-structured content for the section.`;

  // --- Dynamic Prompt Enhancement for Financial Projections ---
  if (input.section === 'financialProjections') {
    const jsonSchema = zodToJsonSchema(FinancialProjectionsSchema, "FinancialProjectionsSchema");
    
    systemPrompt = `You are an expert financial analyst. Your response MUST be ONLY a single, valid JSON object that conforms to the output schema. Do NOT include any other text, markdown, or explanations.`;
    
    finalUserMessage = `Based on the following project data, generate the Financial Projections for a bank DPR.

Project Data:
${JSON.stringify(input.idea, null, 2)}

Your response must be a JSON object that conforms exactly to this JSON schema:
${JSON.stringify(jsonSchema, null, 2)}
`;
  }
  
  try {
    const responseText = await catalystService.generateText(finalUserMessage, systemPrompt);
    const parsedJson = cleanAndParseJSON(responseText);
    
    if (input.section === 'financialProjections') {
      const validatedData = FinancialProjectionsSchema.parse(parsedJson);
      return validatedData as any;
    }

    if (parsedJson && typeof parsedJson === 'object' && 'content' in parsedJson) {
      return { content: parsedJson.content };
    } else {
      return { content: JSON.stringify(parsedJson) };
    }
  } catch (e: any) {
    console.error(`Failed to generate or parse DPR section "${input.section}" from AI:`, e.message || e);
    const errorMessage = e.errors ? JSON.stringify(e.errors, null, 2) : e.message;
    throw new Error(`Failed to generate the section. The AI returned an unrecoverable format or an error occurred: ${errorMessage}`);
  }
}
