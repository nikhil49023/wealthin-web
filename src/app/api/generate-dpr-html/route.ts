'use server';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { DprQuizData } from '@/ai/schemas/dpr';
import { dprSectionConfig } from '@/lib/dpr-config';
import { generateDprSectionAction } from '@/app/actions';

export async function POST(req: Request) {
  try {
    const { quizData }: { quizData: DprQuizData } = await req.json();

    if (!quizData) {
      return NextResponse.json(
        { message: 'Missing quiz data' },
        { status: 400 }
      );
    }
    
    // Read the HTML template
    const templatePath = path.join(process.cwd(), 'src', 'app', 'dpr-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    // --- Inject Static Quiz Data ---
    template = template.replace(/{{PROJECT_NAME}}/g, quizData.projectName || 'N/A');
    template = template.replace(/{{DATE}}/g, new Date().toLocaleDateString('en-GB'));
    template = template.replace(/{{LOGO_URL}}/g, quizData.logoUrl || '');
    template = template.replace(/{{PROMOTER_IMAGE_URL}}/g, quizData.promoterImageUrl || '');
    
    // --- Sequentially Generate and Inject Sectional Content ---
    for (const section of dprSectionConfig) {
        const placeholder = `{{${section.key.toUpperCase()}}}`;
        try {
            const result = await generateDprSectionAction({
                idea: quizData,
                section: section.key,
                basePrompt: section.prompt,
            });

            if (result.success && result.data.content) {
                if (section.key === 'financialProjections') {
                    const financials = result.data.content as any;
                    let financialHtml = '';
                    financialHtml += financials.summaryText || '';
                    financialHtml += financials.projectCost || '';
                    financialHtml += financials.meansOfFinance || '';
                    financialHtml += financials.profitabilityAnalysis || '';
                    financialHtml += financials.cashFlowStatement || '';
                    financialHtml += financials.loanRepaymentSchedule || '';
                    financialHtml += financials.breakEvenAnalysis || '';
                    
                    template = template.replace(placeholder, financialHtml);

                    const costData = JSON.stringify(financials.costBreakdown || []);
                    const yearlyData = JSON.stringify(financials.yearlyProjections || []);
                    template = template.replace(`'{{COST_BREAKDOWN_DATA}}'`, costData);
                    template = template.replace(`'{{YEARLY_PROJECTIONS_DATA}}'`, yearlyData);
                } else {
                    template = template.replace(new RegExp(placeholder, 'g'), result.data.content as string);
                }
            } else {
                 template = template.replace(new RegExp(placeholder, 'g'), `<p class="text-red-500 italic">Error generating this section: ${result.error}</p>`);
            }
        } catch (e: any) {
             template = template.replace(new RegExp(placeholder, 'g'), `<p class="text-red-500 italic">Server error generating this section: ${e.message}</p>`);
        }
    }
    
    // Clean up any remaining placeholders just in case
    template = template.replace(/\{\{[A-Z_]+\}\}/g, '<p class="text-muted-foreground italic">Content not generated for this section.</p>');
    template = template.replace(/'\{\{COST_BREAKDOWN_DATA\}\}'/g, '[]');
    template = template.replace(/'\{\{YEARLY_PROJECTIONS_DATA\}\}'/g, '[]');

    return new NextResponse(template, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error: any) {
    console.error('Error in generate-dpr-html API:', error);
    return NextResponse.json(
      { message: `Failed to generate DPR HTML: ${error.message}` },
      { status: 500 }
    );
  }
}
