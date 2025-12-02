'use server';

import {extractTransactionsFromDocument} from '@/ai/flows/extract-transactions-from-document';
import type {
  ExtractTransactionsInput,
  ExtractTransactionsOutput,
} from '@/ai/schemas/transactions';
import {generateDashboardSummary} from '@/ai/flows/generate-dashboard-summary';
import {generateInvestmentIdeaAnalysis} from '@/ai/flows/generate-investment-idea-analysis';
import type {
  GenerateInvestmentIdeaAnalysisInput,
  GenerateInvestmentIdeaAnalysisOutput,
  GenerateIdeaSectionInput,
  GenerateIdeaSectionOutput,
} from '@/ai/schemas/investment-idea-analysis';
import type {ExtractedTransaction} from '@/ai/schemas/transactions';
import {generateRagAnswer} from '@/ai/flows/generate-rag-answer';
import type {
  GenerateRagAnswerInput,
  GenerateRagAnswerOutput,
} from '@/ai/schemas/rag-answer';

import type {
    GenerateDprSectionInput,
    GenerateDprSectionOutput
} from '@/ai/schemas/dpr';
import {generateFinBite} from '@/ai/flows/generate-fin-bite';
import type {GenerateFinBiteOutput} from '@/ai/schemas/fin-bite';
import {generateBudgetReport} from '@/ai/flows/generate-budget-report';
import type {
  GenerateBudgetReportInput,
  GenerateBudgetReportOutput,
} from '@/ai/schemas/budget-report';
import {generateTts} from '@/ai/flows/generate-tts';
import type {GenerateTtsInput, GenerateTtsOutput} from '@/ai/schemas/tts';
import { generateDprSection } from '@/ai/flows/generate-dpr-section';
import { generateIdeaSection } from '@/ai/flows/generate-idea-section';


export async function extractTransactionsAction(
  input: ExtractTransactionsInput
): Promise<
  | {success: true; data: ExtractTransactionsOutput}
  | {success: false; error: string}
> {
  try {
    const result = await extractTransactionsFromDocument(input);
    return {success: true, data: result};
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      error: `Failed to extract transactions: ${error.message}`,
    };
  }
}

export async function generateDashboardSummaryAction(input: {
  transactions: ExtractedTransaction[];
}): Promise<
  | {success: true; data: any}
  | {success: false; error: string}
> {
  try {
    const result = await generateDashboardSummary(input);
    return {success: true, data: result};
  } catch (error: any) {
    console.error('Error in dashboard summary action:', error);
    return {
      success: false,
      error: `Failed to generate dashboard summary: ${error.message}`,
    };
  }
}

// This action is now deprecated in favor of generateIdeaSectionAction
export async function generateInvestmentIdeaAnalysisAction(
  input: GenerateInvestmentIdeaAnalysisInput
): Promise<
  | {success: true; data: GenerateInvestmentIdeaAnalysisOutput}
  | {success: false; error: string}
> {
  try {
    const result = await generateInvestmentIdeaAnalysis(input);
    return {success: true, data: result};
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      error: `Failed to generate investment idea analysis: ${error.message}`,
    };
  }
}

export async function generateIdeaSectionAction(
  input: GenerateIdeaSectionInput
): Promise<
  | {success: true; data: GenerateIdeaSectionOutput}
  | {success: false; error: string}
> {
  try {
    const result = await generateIdeaSection(input);
    return {success: true, data: result};
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      error: `Failed to generate idea section: ${error.message}`,
    };
  }
}

export async function generateDprSectionAction(
  input: GenerateDprSectionInput
): Promise<
  | {success: true; data: GenerateDprSectionOutput}
  | {success: false; error: string}
> {
  try {
    const result = await generateDprSection(input);
    return {success: true, data: result};
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      error: `Failed to generate DPR section: ${error.message}`,
    };
  }
}


export async function generateRagAnswerAction(
  input: GenerateRagAnswerInput
): Promise<
  | {success: true; data: GenerateRagAnswerOutput}
  | {success: false; error: string}
> {
  try {
    const result = await generateRagAnswer(input);
    return {success: true, data: result};
  } catch (error: any)
    {
    console.error('Error in generateRagAnswerAction:', error);
    return {
      success: false,
      error: `Failed to get advice from AI: ${error.message}`,
    };
  }
}

export async function generateFinBiteAction(): Promise<
  | {success: true; data: GenerateFinBiteOutput}
  | {success: false; error: string}
> {
  try {
    const result = await generateFinBite();
    return {success: true, data: result};
  } catch (error: any) {
    console.error('Error generating Fin Bite:', error);
    return {
      success: false,
      error: `Failed to generate the latest update: ${error.message}`,
    };
  }
}

export async function generateBudgetReportAction(
  input: GenerateBudgetReportInput
): Promise<
  | {success: true; data: GenerateBudgetReportOutput}
  | {success: false; error: string}
> {
  try {
    const result = await generateBudgetReport(input);
    return {success: true, data: result};
  } catch (error: any) {
    console.error('Error in budget report action:', error);
    return {
      success: false,
      error: `Failed to generate budget report: ${error.message}`,
    };
  }
}

export async function generateTtsAction(
  input: GenerateTtsInput
): Promise<
  | {success: true; data: GenerateTtsOutput}
  | {success: false; error: string}
> {
  try {
    const result = await generateTts(input);
    return {success: true, data: result};
  } catch (error: any) {
    console.error('Error in TTS action:', error);
    return {
      success: false,
      error: `Failed to generate audio: ${error.message}`,
    };
  }
}
