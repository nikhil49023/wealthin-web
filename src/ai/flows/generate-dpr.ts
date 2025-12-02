
'use server';
/**
 * @fileOverview A flow for generating a full Detailed Project Report (DPR) using the Zoho Catalyst LLM.
 * This flow takes a comprehensive quiz data object and generates a multi-section report.
 */
import catalystService from '@/services/catalyst';
import type { DprQuizData, GenerateDprOutput } from '@/ai/schemas/dpr';
import { GenerateDprOutputSchema } from '@/ai/schemas/dpr';
import { cleanAndParseJSON } from '@/lib/cleanJson';

export async function generateDpr(
  input: DprQuizData
): Promise<GenerateDprOutput> {
  // System prompt remains a high-level instruction.
  const systemPrompt = `You are an expert financial consultant hired to write a bank-ready Detailed Project Report (DPR) for an MSME in India.
Your response MUST be ONLY a single, valid JSON object that conforms exactly to the output schema.
Do not include any other text, markdown, or explanations. Use basic HTML for formatting within the string values (e.g., <h3>, <p>, <ul>, <li>, <strong>).`;

  // The user prompt is a single, clean string containing the instructions and the user's data.
  const userMessage = `
Generate a complete Detailed Project Report based on the following project data. The output must be a valid JSON object.

**Project Data:**
\`\`\`json
${JSON.stringify(input)}
\`\`\`

**Instructions:**
Based on the project data provided, generate detailed, professional, and well-structured content for each of the following sections of a DPR.
All financial figures should be in Indian Rupees (INR).

**Required Output JSON Schema:**
{
  "executiveSummary": "string (HTML)",
  "projectIntroduction": "string (HTML)",
  "promoterDetails": "string (HTML)",
  "businessModel": "string (HTML)",
  "marketAnalysis": "string (HTML)",
  "locationAndSite": "string (HTML)",
  "technicalFeasibility": "string (HTML)",
  "implementationSchedule": "string (HTML)",
  "financialProjections": {
    "summaryText": "string (HTML)",
    "projectCost": "string (HTML)",
    "meansOfFinance": "string (HTML)",
    "costBreakdown": [{ "name": "string", "value": "number" }],
    "yearlyProjections": [{ "year": "string", "sales": "number", "profit": "number" }],
    "profitabilityAnalysis": "string (HTML)",
    "cashFlowStatement": "string (HTML)",
    "loanRepaymentSchedule": "string (HTML)",
    "breakEvenAnalysis": "string (HTML)"
  },
  "swotAnalysis": "string (HTML)",
  "regulatoryCompliance": "string (HTML)",
  "riskAssessment": "string (HTML)",
  "annexures": "string (HTML)"
}

Your response must be only the JSON object.
`;

  try {
    const responseText = await catalystService.generateText(userMessage, systemPrompt);
    const parsedJson = cleanAndParseJSON(responseText);
    
    // Validate the parsed JSON against the Zod schema
    const validatedData = GenerateDprOutputSchema.parse(parsedJson);
    return validatedData;

  } catch (e: any) {
    console.error('Failed to generate or parse DPR from AI:', e.message);
    throw new Error(`Failed to generate the DPR. The AI returned an unrecoverable format or an error occurred: ${e.message}`);
  }
}
