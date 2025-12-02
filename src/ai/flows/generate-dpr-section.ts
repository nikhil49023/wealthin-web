'use server';

import catalystService from '@/services/catalyst';
import type { GenerateDprSectionInput, GenerateDprSectionOutput } from '@/ai/schemas/dpr';
import { GenerateDprOutputSchema, FinancialProjectionsSchema } from '@/ai/schemas/dpr';
import { cleanAndParseJSON } from '@/lib/cleanJson';


export async function generateDprSection(
  input: GenerateDprSectionInput
): Promise<GenerateDprSectionOutput> {

  const systemPrompt = `You are an expert consultant hired to write a bank-ready Detailed Project Report (DPR) for an MSME in India.
You will be given user-provided data in a JSON format about the business idea.
Your task is to generate the content for ONLY ONE specific section of the DPR.
The output MUST be a valid JSON object with a single key "content", where the value is the generated text for that section.
All financial figures should be in Indian Rupees (INR).
Generate detailed, professional, and well-structured content for the section. Use basic HTML for formatting (e.g., <h3>, <p>, <ul>, <li>, <strong>).`;
  
  const userMessage = `
Generate the content for the "${input.section}" section of a Detailed Project Report.

Here is the overall project data:
${JSON.stringify(input.idea)}

Here are the specific instructions for the "${input.section}" section you need to generate:
---
${input.basePrompt}
---

${input.section === 'financialProjections' ? 
`For the 'financialProjections' section, the 'content' value MUST be a JSON object that strictly conforms to this schema:
${JSON.stringify(FinancialProjectionsSchema.jsonSchema.properties)}` 
: 
"For all other sections, the 'content' value MUST be a single string containing the generated HTML text."
}

If you are refining existing content, use the following as a base and apply the user's refinement instructions.
Existing Content: ${input.existingContent || 'N/A'}
Refinement Instruction: ${input.refinementPrompt || 'N/A'}

Your final output must be a single, valid JSON object: { "content": "..." } or { "content": { ... } }.
`;

  try {
    const responseText = await catalystService.generateText(userMessage, systemPrompt);
    const parsedJson = cleanAndParseJSON(responseText);
    
    if ('content' in parsedJson) {
      return { content: parsedJson.content };
    } else {
      // If the AI just returns the content directly, wrap it
      return { content: parsedJson };
    }
  } catch (e: any) {
    console.error(`Failed to generate or parse DPR section "${input.section}" from AI:`, e.message);
    throw new Error(`Failed to generate the section. The AI returned an unrecoverable format or an error occurred: ${e.message}`);
  }
}
