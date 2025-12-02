'use server';

import catalystService from '@/services/catalyst';
import type {
  GenerateDprInput,
  GenerateDprOutput
} from '@/ai/schemas/dpr';
import {
  GenerateDprOutputSchema
} from '@/ai/schemas/dpr';

function cleanAndParseJSON(text: string) {
  // Attempt to remove markdown code blocks
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse cleaned JSON:", e);
    console.error("Original text:", text);
    throw new Error("AI returned malformed JSON.");
  }
}


export async function generateDpr(
  input: GenerateDprInput
): Promise < GenerateDprOutput > {

  const systemPrompt = `You are an expert consultant hired to write a bank-ready Detailed Project Report (DPR) for an MSME in India.
You will be given a JSON object with user-provided data.
Your response MUST be a single, valid JSON object conforming to the output schema. Do NOT include any other text, markdown, or explanations.
All financial figures should be in Indian Rupees (INR).
Generate detailed, professional, and well-structured content for each section.`;

  const userPrompt = `
Based on the following project data, please generate the content for a Detailed Project Report.

**User-Provided Data:**
\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

**Output Schema:**
Your response must be a JSON object with the following keys and value types:
- executiveSummary: (string) A concise overview of the entire project.
- projectIntroduction: (string) Detailed introduction to the project.
- promoterDetails: (string) Details about the entrepreneur.
- marketAnalysis: (string) Analysis of the target market, competition, etc.
- technicalFeasibility: (string) Details on technology, machinery, and process.
- financialProjections: (object) A detailed financial projection object.
- swotAnalysis: (string) Strengths, Weaknesses, Opportunities, Threats analysis.
- regulatoryCompliance: (string) Details on legal and regulatory aspects.
- riskAssessment: (string) Identification of risks and mitigation strategies.
- annexures: (string) List of attached documents.

Generate the content for each field now.
`;

  try {
    const responseText = await catalystService.generateText(userPrompt, systemPrompt);
    const parsedJson = cleanAndParseJSON(responseText);
    return GenerateDprOutputSchema.parse(parsedJson);
  } catch (e: any) {
    console.error("Failed to generate or parse DPR from AI:", e.message);
    throw new Error(`Failed to generate the DPR: ${e.message}`);
  }
}