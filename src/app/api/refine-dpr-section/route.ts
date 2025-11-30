
'use server';

import { generateDprSection } from '@/ai/flows/generate-dpr-section';
import { NextResponse } from 'next/server';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';

// This is a new API route to handle the AI refinement requests from the DPR template.

export async function POST(req: Request) {
  try {
    const { section, existingContent, refinementPrompt, idea, promoterName } = await req.json();

    if (!section || !existingContent || !refinementPrompt || !idea || !promoterName) {
      return NextResponse.json(
        { message: 'Missing required fields: section, existingContent, refinementPrompt, idea, or promoterName' },
        { status: 400 }
      );
    }
    
    // Find the base prompt for the section - for refinement, it's generic
    const basePrompt = "Refine the provided content based on the user's instruction.";

    const result = await generateDprSection({
        idea: idea,
        promoterName: promoterName,
        section: section,
        basePrompt: basePrompt,
        existingContent: existingContent,
        refinementPrompt: refinementPrompt,
    });
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in refine-dpr-section API:', error);
    return NextResponse.json(
      { message: `Failed to refine section: ${error.message}` },
      { status: 500 }
    );
  }
}
