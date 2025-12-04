
'use server';
/**
 * @fileOverview A flow for generating a single section of a business idea analysis using the Zoho Catalyst LLM.
 */
import { generateText } from '@/services/catalyst';
import type { GenerateIdeaSectionInput, GenerateIdeaSectionOutput } from '@/ai/schemas/investment-idea-analysis';

const sectionPrompts: { [key: string]: string } = {
  investmentStrategy: 'Provide a detailed breakdown of the required investment. Include estimated initial capital for equipment, setup, licenses, and initial marketing. Also, estimate the monthly operational costs (working capital). Present the data in a structured way using lists.',
  targetAudience: 'Describe the primary and secondary target audience in detail. Outline a practical, step-by-step marketing and sales strategy to reach these customers.',
  roi: 'Give a realistic analysis of the potential Return on Investment. Detail the projected revenue streams, key profitability drivers, and an estimated timeline to break even and achieve profitability.',
  futureProofing: "Analyze the business's long-term viability. Discuss potential for scalability (e.g., expanding product lines, entering new markets), how to handle competition, and strategies to adapt to future market trends.",
  relevantSchemes: 'List 2-3 specific and relevant Indian government schemes that could support this business. For each scheme, clearly explain the benefits (e.g., subsidy amount, loan terms) and the primary eligibility criteria.',
  legalRequirements: 'Summarize the key legal and regulatory requirements for starting this business in India. Include necessary registrations (like GST, Udyam), important licenses, and permits required to operate legally.',
};


export async function generateIdeaSection(
  input: GenerateIdeaSectionInput
): Promise<GenerateIdeaSectionOutput> {
  const { idea, section } = input;
  const basePrompt = sectionPrompts[section];

  if (!basePrompt) {
    throw new Error(`Invalid section key provided: ${section}`);
  }

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
    const text = await generateText(finalPrompt, systemPrompt);
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
