
'use server';
/**
 * @fileOverview A flow for generating a single section of a Detailed Project Report (DPR) using the Zoho Catalyst LLM.
 * It can generate content from scratch or refine existing content based on a custom prompt.
 */
import catalystService from '@/services/catalyst';
import type { GenerateDprSectionInput, GenerateDprSectionOutput } from '@/ai/schemas/dpr';

/**
 * Cleans the raw text response from an AI model to extract a valid HTML string.
 * @param text The raw text response from the AI.
 * @returns A clean string.
 */
function cleanAiResponse(text: string): string {
    if (!text) return '';

    let content = text.trim();

    // 1. Regex to find content within markdown-style code blocks (e.g., ```html ... ```)
    const codeBlockRegex = /```(?:html|text)?\s*([\s\S]*?)\s*```/;
    const match = content.match(codeBlockRegex);

    if (match && match[1]) {
        content = match[1].trim();
    }
    
    // 2. As a fallback for responses that don't use markdown blocks,
    // remove any text before the first "<" and after the last ">".
    // This is a bit aggressive but effective for isolating HTML.
    const firstTag = content.indexOf('<');
    const lastTag = content.lastIndexOf('>');
    
    if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
        // If there's content before the first HTML tag that looks like a sentence, it might be a preamble.
        const preamble = content.substring(0, firstTag).trim();
        if (preamble.length > 10 && preamble.includes(' ')) { // Heuristic for a sentence
            content = content.substring(firstTag);
        }
    }

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
Maintain the original format (HTML).
All financial figures MUST be in Indian Rupees (INR).
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
All financial figures MUST be in Indian Rupees (INR) and use the '₹' symbol.

**Critical Output Format:**
- You MUST output ONLY the generated text content as a raw string using basic HTML for formatting (<h3>, <p>, <ul>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td>).
- Do NOT include any other text, markdown formatting (like \`\`\`html), titles, or explanations in your response. Just the raw HTML content.
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
    const cleanedText = cleanAiResponse(rawText);

    if (!cleanedText) {
      console.warn("AI returned empty or un-cleanable content for section \"" + section + "\". Raw response was: ", rawText);
      throw new Error(`The AI returned empty content for the "${section}" section. This might be due to a very specific or restrictive prompt.`);
    }
    
    return { content: cleanedText };

  } catch (e: any) {
    console.error("Failed to generate or parse AI response for section \"" + section + "\":", e.message);
    throw new Error(`The AI returned an invalid format for the ${section} section. Please try again or rephrase the idea.`);
  }
}
