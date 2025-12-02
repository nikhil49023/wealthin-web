
'use server';

import catalystService from '@/services/catalyst';
import type {
  GenerateDprInput,
  GenerateDprOutput
} from '@/ai/schemas/dpr';
import {
  GenerateDprOutputSchema
} from '@/ai/schemas/dpr';
import { cleanAndParseJSON } from '@/lib/cleanJson';


export async function generateDpr(
  input: GenerateDprInput
): Promise < GenerateDprOutput > {

  const systemPrompt = `You are an expert consultant hired to write a bank-ready Detailed Project Report (DPR) for an MSME in India.
You will be given user-provided data in a JSON format.
Your response MUST be a single, valid JSON object conforming to the output schema. Do NOT include any other text, markdown, or explanations.
All financial figures should be in Indian Rupees (INR).
Generate detailed, professional, and well-structured content for each section.`;
  
  // Construct a single, clear string prompt as requested
  const userMessage = `
Act as a bank-grade DPR generator. Take the following JSON data and generate full, narrative sections for a Detailed Project Report (executiveSummary, promoterDetails, technicalFeasibility, marketAnalysis, financialProjections, swotAnalysis, regulatoryCompliance, riskAssessment, and annexures). Return ONLY a valid JSON object with those sections as keys and their generated content as string values.

Here is the project data:
${JSON.stringify(input)}

Your output must be a valid, parsable JSON object matching the expected schema.
`;

  try {
    const responseText = await catalystService.generateText(userMessage, systemPrompt);
    const parsedJson = cleanAndParseJSON(responseText); 
    return GenerateDprOutputSchema.parse(parsedJson);
  } catch (e: any) {
    console.error("Failed to generate or parse DPR from AI:", e.message);
    throw new Error(`Failed to generate the DPR. The AI returned an unrecoverable format or an error occurred: ${e.message}`);
  }
}
