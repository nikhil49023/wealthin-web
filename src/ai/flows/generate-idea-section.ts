
'use server';
/**
 * @fileOverview A flow for generating a single section of a business idea analysis using the Zoho Catalyst LLM.
 */
import catalystService from '@/services/catalyst';
import type { GenerateIdeaSectionInput, GenerateIdeaSectionOutput } from '@/ai/schemas/investment-idea-analysis';

export async function generateIdeaSection(
  input: GenerateIdeaSectionInput
): Promise<GenerateIdeaSectionOutput> {
  const { idea, section, basePrompt } = input;

  const systemPrompt = `You are a specialist consultant for entrepreneurs in India.
Your task is to provide a detailed, well-structured, and professional analysis for a specific section of a business idea.
The output MUST be ONLY the raw content string, using basic HTML for formatting (e.g., <h3>, <p>, <ul>, <li>, <strong>).
Do NOT include any other text, markdown, titles, or explanations in your response. Just the raw HTML content.`;

  const finalPrompt = `
Business Idea: "${idea}"

Your current task is to generate the content for ONLY the following section: **${section}**.

**Section-Specific Instructions:**
${basePrompt}

Generate the content now.
`;

  try {
    const text = await catalystService.generateText(finalPrompt, systemPrompt);
    return { content: text };
  } catch (e: any) {
    console.error("Failed to generate AI response for section \"" + section + "\":", e.message);
    if (e.message.includes('CRITICAL RUNTIME ERROR') || e.message.includes('invalid_client')) {
      return { content: `<p class="text-destructive">Error: AI features are temporarily unavailable due to a configuration issue.</p>` };
    }
    // Re-throwing the error to be caught by the action
    throw new Error(`The AI returned an invalid format for the ${section} section.`);
  }
}
