'use server';

import catalystService from '@/services/catalyst';
import type { GenerateDprSectionInput, GenerateDprSectionOutput } from '@/ai/schemas/dpr';
import { FinancialProjectionsSchema } from '@/ai/schemas/dpr';
import { cleanAndParseJSON } from '@/lib/cleanJson';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

async function generateHtmlContent(prompt: string, idea: any): Promise<string> {
    const finalUserMessage = prompt.replace('{{idea}}', JSON.stringify(idea, null, 2));
    const systemPrompt = `You are an expert consultant writing a Detailed Project Report (DPR). The output MUST be ONLY a raw HTML string. Do NOT include any other text, markdown, or explanations.`;
    return await catalystService.generateText(finalUserMessage, systemPrompt);
}

async function generateChartData(prompt: string, idea: any, schema: z.ZodType<any, any>): Promise<any> {
    const jsonSchema = zodToJsonSchema(schema);
    const systemPrompt = `You are a financial analyst. Your response MUST be ONLY a single, valid JSON array that conforms to the output schema. Do NOT include any other text, markdown, or explanations.`;
    const finalUserMessage = `${prompt.replace('{{idea}}', JSON.stringify(idea, null, 2))}\n\nYour response must be a JSON array that conforms exactly to this JSON schema:\n${JSON.stringify(jsonSchema, null, 2)}`;
    const responseText = await catalystService.generateText(finalUserMessage, systemPrompt);
    return cleanAndParseJSON(responseText);
}

export async function generateDprSection(
  input: GenerateDprSectionInput
): Promise<GenerateDprSectionOutput> {

  try {
    const ideaJson = JSON.stringify(input.idea, null, 2);

    // --- Handle Financial Projections Section ---
    if (input.section === 'financialProjections') {
      
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
        generateHtmlContent(`Generate a brief summary of the financial outlook for this project: ${ideaJson}`, input.idea),
        generateHtmlContent(`Generate a detailed breakdown of total project costs as HTML for this project: ${ideaJson}`, input.idea),
        generateHtmlContent(`Generate the 'Means of Finance' section, detailing how the project will be financed (equity, debt) as HTML for this project: ${ideaJson}`, input.idea),
        generateChartData(`Generate a JSON array for a pie chart of cost breakdown (e.g., land, machinery). Project Data: ${ideaJson}`, input.idea, z.array(z.object({ name: z.string(), value: z.number() }))),
        generateChartData(`Generate a JSON array for a bar chart of yearly sales and profit projections for the first 3 years. Project Data: ${ideaJson}`, input.idea, z.array(z.object({ year: z.string(), sales: z.number(), profit: z.number() }))),
        generateHtmlContent(`Generate a detailed 'Profitability Analysis' section as HTML for this project: ${ideaJson}`, input.idea),
        generateHtmlContent(`Generate a projected 'Cash Flow Statement' for the first year as HTML for this project: ${ideaJson}`, input.idea),
        generateHtmlContent(`Generate a sample 'Loan Repayment Schedule' as HTML for this project: ${ideaJson}`, input.idea),
        generateHtmlContent(`Generate a 'Break-Even Analysis' as HTML for this project: ${ideaJson}`, input.idea),
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

      const validatedData = FinancialProjectionsSchema.parse(financialData);
      return { content: validatedData };
    }

    // --- Handle all other standard HTML content sections ---
    let userPrompt = input.basePrompt;
    if (input.existingContent && input.refinementPrompt) {
        userPrompt += `\n\nThe user wants to refine the existing content. Their instruction is: "${input.refinementPrompt}".\n\nHere is the existing content to refine:\n${input.existingContent}`;
    }
    const finalUserMessage = userPrompt.replace('{{idea}}', ideaJson);
    
    const systemPrompt = `You are an expert consultant hired to write a bank-ready Detailed Project Report (DPR) for an MSME in India.
Your task is to generate the content for ONLY ONE specific section of the DPR.
All financial figures should be in Indian Rupees (INR).
The output MUST be ONLY the raw content string, using basic HTML for formatting (e.g., <h3>, <p>, <ul>, <li>, <strong>).
Do NOT include any other text, markdown, titles, or explanations in your response. Just the raw HTML content.`;

    const content = await catalystService.generateText(finalUserMessage, systemPrompt);
    return { content: content };

  } catch (e: any) {
    console.error(`Failed to generate or parse DPR section "${input.section}" from AI:`, e);
    const errorMessage = e.errors ? JSON.stringify(e.errors, null, 2) : e.message;
    throw new Error(`Failed to generate the section. The AI returned an unrecoverable format or an error occurred: ${errorMessage}`);
  }
}
