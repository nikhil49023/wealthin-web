
'use server';
/**
 * @fileOverview A flow for generating a single section of a Detailed Project Report (DPR) using the Zoho Catalyst LLM.
 * It can generate content from scratch or refine existing content based on a custom prompt.
 */
import catalystService from '@/services/catalyst';
import type { GenerateDprSectionInput, GenerateDprSectionOutput } from '@/ai/schemas/dpr';

/**
 * Cleans the raw text response from an AI model to extract a valid JSON string
 * or a clean HTML/text block.
 * @param text The raw text response from the AI.
 * @param expectJson Whether to specifically look for a JSON block.
 * @returns A clean string.
 */
function cleanAiResponse(text: string, expectJson: boolean = false): string {
    if (!text) return '';

    let content = text.trim();

    // 1. Regex to find content within markdown-style code blocks (e.g., ```json ... ``` or ```html ... ```)
    const codeBlockRegex = /```(?:json|html|text)?\s*([\s\S]*?)\s*```/;
    const match = content.match(codeBlockRegex);

    if (match && match[1]) {
        content = match[1].trim();
    }

    // 2. If JSON is expected, find the first and last curly braces as a fallback.
    if (expectJson) {
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            return content.substring(firstBrace, lastBrace + 1);
        }
    }
    
    // 3. For non-JSON, we assume the main content is what we need, even if there's no code block.
    // The initial trim and regex should handle most cases.
    return content;
}


export async function generateDprSection(
  input: GenerateDprSectionInput
): Promise<GenerateDprSectionOutput> {
  const { idea, promoterName, section, basePrompt, existingContent, refinementPrompt } = input;

  const businessProfile = `
---
**Business Profile**
Title: ${idea.title}
Summary: ${idea.summary}
InvestmentStrategy: ${idea.investmentStrategy}
TargetAudience: ${idea.targetAudience}
ROI Projection: ${idea.roi}
Future-Proofing: ${idea.futureProofing}
Relevant Schemes: ${idea.relevantSchemes}
Legal Requirements: ${idea.legalRequirements}
---`;

  let finalPrompt: string;
  let systemPrompt: string;

  if (refinementPrompt && existingContent) {
    // Mode 2: Refine existing content
    systemPrompt = `You are an expert consultant editing a Detailed Project Report (DPR).
Your task is to rewrite the "Existing Content" based on the "User's Instruction".
Maintain the original format (JSON for financial projections, HTML for others).
Output ONLY the refined, complete content for the section. Do not add any extra commentary.`;
    
    finalPrompt = `
**User's Instruction:** "${refinementPrompt}"

**Existing Content to Refine:**
---
${typeof existingContent === 'object' ? JSON.stringify(existingContent, null, 2) : existingContent}
---

**Business Profile (for context):**
${businessProfile}
`;
  } else {
    // Mode 1: Generate from scratch
    systemPrompt = `You are an expert consultant hired to write a bank-ready Detailed Project Report (DPR) for an entrepreneur in India.
You have been provided with a detailed business profile and the promoter's name.

**Critical Output Format:**
- For all sections EXCEPT 'financialProjections', you MUST output ONLY the generated text content as a raw string using basic HTML for formatting (<h3>, <p>, <ul>, <li>).
- For the 'financialProjections' section, you MUST output ONLY a valid JSON object matching the required schema for financial data.
- Do NOT include any other text, markdown formatting (like \`\`\`json), titles, or explanations in your response. Just the raw content.
`;
    
    finalPrompt = `
Your current task is to generate the content for ONLY the following section: **${section}**.

**Section-Specific Instructions:**
${basePrompt}

**Business Profile (for context):**
${businessProfile}

**Promoter's Name:** "${promoterName}"

Now, generate the content for the "${section}" section.
`;
  }

  try {
    const rawText = await catalystService.generateText(finalPrompt, systemPrompt);
    const isJsonExpected = section === 'financialProjections' || (typeof existingContent === 'object' && refinementPrompt);
    
    const cleanedText = cleanAiResponse(rawText, isJsonExpected);

    if (isJsonExpected) {
      // For financialProjections, ensure parsing succeeds before returning
      try {
        const parsed = JSON.parse(cleanedText);
        return { content: parsed };
      } catch (jsonError: any) {
        console.error(`JSON Parsing failed for section "${section}". Raw text:`, cleanedText);
        throw new Error(`The AI returned malformed JSON for the ${section} section.`);
      }
    } else {
      if (!cleanedText) {
        // Handle cases where the AI returns an empty but valid response
        console.warn(`AI returned empty content for section "${section}".`);
        return { content: '<p>No content was generated for this section.</p>' };
      }
      return { content: cleanedText };
    }
  } catch (e: any) {
    console.error(`Failed to generate or parse AI response for section "${section}":`, e.message);
    throw new Error(`The AI returned an invalid format for the ${section} section.`);
  }
}
