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
  
  const userMessage = `
Generate the content for the "${input.section}" section of a Detailed Project Report.

Here is the overall project data:
${JSON.stringify(input.idea)}

Here are the specific instructions for the "${input.section}" section you need to generate:
---
${input.basePrompt}
---

${input.section === 'financialProjections' ? 
`For the 'financialProjections' section, your entire response MUST be a single, valid JSON object that strictly conforms to this schema (do NOT wrap it in any other markdown or text):
${JSON.stringify(FinancialProjectionsSchema._def.properties)}` 
: 
"For all other sections, the output MUST be a valid JSON object with a single key 'content' where the value is the generated HTML text using basic tags like <h3>, <p>, <ul>, <li>, <strong>. Example: { \"content\": \"<h3>My Section</h3><p>Details...</p>\" }"
}

If you are refining existing content, use the following as a base and apply the user's refinement instructions.
Existing Content: ${input.existingContent || 'N/A'}
Refinement Instruction: ${input.refinementPrompt || 'N/A'}

Your final output must be a single, valid JSON object.
`;

  try {
    const responseText = await catalystService.generateText(userMessage, systemPrompt);
    const parsedJson = cleanAndParseJSON(responseText);
    
    // If it's the financial section, the AI returns the object directly. We wrap it for consistency.
    if (input.section === 'financialProjections') {
      const validatedData = FinancialProjectionsSchema.parse(parsedJson);
      return { content: validatedData };
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
