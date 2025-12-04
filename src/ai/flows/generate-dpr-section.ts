
'use server';

import { generateText } from '@/services/catalyst';
import type { GenerateDprSectionInput, GenerateDprSectionOutput } from '@/ai/schemas/dpr';
import { FinancialProjectionsSchema } from '@/ai/schemas/dpr';
import { cleanAndParseJSON } from '@/lib/cleanJson';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const DPR_MODEL = 'crm-di-qwen_text_14b-fp8-it';

// Helper to generate simple HTML content for most sections
async function generateHtmlContent(prompt: string, idea: any): Promise<string> {
    const finalUserMessage = prompt.replace('{{idea}}', JSON.stringify(idea, null, 2));
    const systemPrompt = `You are an expert consultant writing a Detailed Project Report (DPR). The output MUST be ONLY a raw HTML string. Do NOT include any other text, markdown, or explanations.`;
    return await generateText(finalUserMessage, systemPrompt, DPR_MODEL);
}

// Helper to generate specific JSON data for charts
async function generateChartData(prompt: string, idea: any, schema: z.ZodType<any, any>): Promise<any> {
    const jsonSchema = zodToJsonSchema(schema);
    const systemPrompt = `You are a financial analyst. Your response MUST be ONLY a single, valid JSON array that conforms to the output schema. Do NOT include any other text, markdown, or explanations.`;
    const finalUserMessage = `${prompt.replace('{{idea}}', JSON.stringify(idea, null, 2))}\n\nYour response must be a JSON array that conforms exactly to this JSON schema:\n${JSON.stringify(jsonSchema, null, 2)}`;
    
    const responseText = await generateText(finalUserMessage, systemPrompt, DPR_MODEL);
    const parsedJson = cleanAndParseJSON(responseText);
    
    // Validate the parsed JSON against the provided Zod schema
    const validationResult = schema.safeParse(parsedJson);
    if (!validationResult.success) {
        console.error("Chart data validation failed:", validationResult.error.errors);
        throw new Error(`AI returned invalid chart data format: ${validationResult.error.message}`);
    }
    
    return validationResult.data;
}


// --- New function to specifically handle the complex financial projections section ---
async function generateFinancialProjections(idea: any): Promise<any> {
    const ideaJson = JSON.stringify(idea, null, 2);

    const [
      summaryText,
      projectCost,
      meansOfFinance,
      costBreakdown,
      yearlyProjections,
      profitabilityAnalysis,
      cashFlowStatement,
      loanRepaymentSchedule,
      breakEvenAnalysis,
    ] = await Promise.all([
      generateHtmlContent(`Generate a brief summary of the financial outlook for this project: ${ideaJson}`, idea),
      generateHtmlContent(`Generate a detailed breakdown of total project costs as HTML for this project: ${ideaJson}`, idea),
      generateHtmlContent(`Generate the 'Means of Finance' section, detailing how the project will be financed (equity, debt) as HTML for this project: ${ideaJson}`, idea),
      generateChartData(`Generate a JSON array for a pie chart of cost breakdown (e.g., land, machinery). Project Data: ${ideaJson}`, idea, z.array(z.object({ name: z.string(), value: z.number() }))),
      generateChartData(`Generate a JSON array for a bar chart of yearly sales and profit projections for the first 3 years. Project Data: ${ideaJson}`, idea, z.array(z.object({ year: z.string(), sales: z.number(), profit: z.number() }))),
      generateHtmlContent(`Generate a detailed 'Profitability Analysis' section as HTML for this project: ${ideaJson}`, idea),
      generateHtmlContent(`Generate a projected 'Cash Flow Statement' for the first year as HTML for this project: ${ideaJson}`, idea),
      generateHtmlContent(`Generate a sample 'Loan Repayment Schedule' as HTML for this project: ${ideaJson}`, idea),
      generateHtmlContent(`Generate a 'Break-Even Analysis' as HTML for this project: ${ideaJson}`, idea),
    ]);

    const financialData = {
      summaryText,
      projectCost,
      meansOfFinance,
      costBreakdown,
      yearlyProjections,
      profitabilityAnalysis,
      cashFlowStatement,
      loanRepaymentSchedule,
      breakEvenAnalysis,
    };

    // Validate the final combined object against the master Zod schema
    const validatedData = FinancialProjectionsSchema.parse(financialData);
    return validatedData;
}


export async function generateDprSection(
  input: GenerateDprSectionInput
): Promise<GenerateDprSectionOutput> {

  try {
    // --- Handle Financial Projections Section ---
    if (input.section === 'financialProjections') {
      const financialData = await generateFinancialProjections(input.idea);
      return { content: financialData };
    }

    const ideaJson = JSON.stringify(input.idea, null, 2);
    let systemPrompt: string;
    let finalUserMessage: string;

    // --- Handle Refinement/Code Generation ---
    if (input.existingContent && input.refinementPrompt) {
        systemPrompt = `You are an expert web developer and financial analyst creating a Detailed Project Report (DPR).
Your task is to modify an HTML snippet based on a user's instruction.
The user's instruction may require you to:
1.  Rewrite or rephrase existing text.
2.  Add new HTML elements like lists, tables, or complex layouts using Tailwind CSS classes.
3.  Generate complex visual elements like a roadmap or flowchart using styled HTML and CSS. You can use inline styles if necessary.
4.  If asked to add a graph or chart, you MUST output a valid JSON object string for Chart.js, NOT an HTML canvas element. For example: \`{"type":"bar","data":{...}}\`.

CRITICAL: Your output MUST be ONLY the raw, complete, and valid HTML content for the section. Do NOT include any other text, markdown, or explanations.
If generating a chart, output ONLY the stringified JSON object for that chart.`;

        finalUserMessage = `Project Data: ${ideaJson}\n\nRefine the following HTML content for the "${input.section}" section based on my instruction.\n\nInstruction: "${input.refinementPrompt}"\n\nExisting HTML Content:\n\`\`\`html\n${input.existingContent}\n\`\`\``;

    } else {
    // --- Handle all other standard HTML content sections ---
        systemPrompt = `You are an expert consultant hired to write a bank-ready Detailed Project Report (DPR) for an MSME in India.
Your task is to generate the content for ONLY ONE specific section of the DPR.
All financial figures should be in Indian Rupees (INR).
The output MUST be ONLY the raw content string, using basic HTML for formatting (e.g., <h3>, <p>, <ul>, <li>, <strong>).
Do NOT include any other text, markdown, titles, or explanations in your response. Just the raw HTML content.`;
        finalUserMessage = input.basePrompt.replace('{{idea}}', ideaJson);
    }
    
    const content = await generateText(finalUserMessage, systemPrompt, DPR_MODEL);
    return { content: content };

  } catch (e: any) {
    if (e.message.includes('CRITICAL RUNTIME ERROR') || e.message.includes('invalid_client')) {
       throw new Error('AI features are temporarily unavailable due to a configuration issue. Please contact support.');
    }
    console.error(`Failed to generate or parse DPR section "${input.section}" from AI:`, e);
    // Correctly extract Zod error messages if they exist
    const errorMessage = e instanceof z.ZodError ? JSON.stringify(e.errors, null, 2) : e.message;
    throw new Error(`Failed to generate the section. The AI returned an unrecoverable format or an error occurred: ${errorMessage}`);
  }
}
