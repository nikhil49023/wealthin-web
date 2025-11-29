
'use server';

import { generateDprSection } from '@/ai/flows/generate-dpr-section';
import { NextResponse } from 'next/server';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';

// This is a new API route to handle the AI refinement requests from the DPR template.

export async function POST(req: Request) {
  try {
    const { section, existingContent, refinementPrompt } = await req.json();

    // The full idea analysis should be stored in localStorage on the client
    // and passed along with the request if needed. For now, we'll create a
    // dummy object as the flow requires it. A more robust implementation
    // would fetch this or pass it from the client.
    const dummyIdea: GenerateInvestmentIdeaAnalysisOutput = {
        title: "Business Idea",
        summary: "A general business idea.",
        investmentStrategy: "",
        targetAudience: "",
        roi: "",
        futureProofing: "",
        relevantSchemes: "",
        legalRequirements: "",
    };

    if (!section || !existingContent || !refinementPrompt) {
      return NextResponse.json(
        { message: 'Missing required fields: section, existingContent, or refinementPrompt' },
        { status: 400 }
      );
    }
    
    // Find the base prompt for the section
    const basePrompt = "Refine the provided content based on the user's instruction.";

    const result = await generateDprSection({
        idea: dummyIdea,
        promoterName: "[Promoter]",
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

    