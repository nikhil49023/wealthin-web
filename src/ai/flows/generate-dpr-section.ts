
'use server';
/**
 * @fileOverview A flow for generating a single section of a Detailed Project Report (DPR) using the Zoho Catalyst LLM.
 * It can generate content from scratch or refine existing content based on a custom prompt.
 */
import catalystService from '@/services/catalyst';
import type { GenerateDprSectionInput, GenerateDprSectionOutput } from '@/ai/schemas/dpr';

function cleanAiResponse(response: string): string {
    if (!response || typeof response !== 'string') {
        return '';
    }
    // Remove markdown code blocks and trim whitespace
    const cleaned = response.replace(/```html/g, '').replace(/```/g, '').trim();
    return cleaned;
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
    const text = cleanAiResponse(rawText);
    
    if (!text) {
      throw new Error(`The AI returned empty or invalid content for the "${section}" section. This can happen due to a restrictive prompt or a temporary service issue.`);
    }
    
    return { content: text };

  } catch (e: any) {
    console.error("Failed to generate or parse AI response for section \"" + section + "\":", e.message);
    throw new Error(`The AI returned an invalid format for the ${section} section. Please try again or rephrase the idea.`);
  }
}
