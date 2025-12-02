'use server';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { DprQuizData } from '@/ai/schemas/dpr';
import type { FinancialProjectionsSchema } from '@/ai/schemas/dpr';

export async function POST(req: Request) {
  try {
    const { sections, quizData }: { sections: {key: string, content: any}[], quizData: DprQuizData } = await req.json();

    if (!sections || !quizData) {
      return NextResponse.json(
        { message: 'Missing sections or quiz data' },
        { status: 400 }
      );
    }
    
    // Read the HTML template
    const templatePath = path.join(process.cwd(), 'src', 'app', 'dpr-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    // --- Inject Quiz Data ---
    template = template.replace(/{{PROJECT_NAME}}/g, quizData.projectName || 'N/A');
    template = template.replace(/{{DATE}}/g, new Date().toLocaleDateString('en-GB'));
    template = template.replace(/{{LOGO_URL}}/g, quizData.logoUrl || '');
    template = template.replace(/{{PROMOTER_IMAGE_URL}}/g, quizData.productImageUrl || '');
    
    // --- Inject Sectional Content ---
    for (const section of sections) {
        const placeholder = `{{${section.key.toUpperCase()}}}`;
        
        if (section.key === 'financialProjections' && typeof section.content === 'object') {
            const financials = section.content;
            // Handle complex financial object
            let financialHtml = '';
            financialHtml += financials.summaryText || '';
            financialHtml += financials.projectCost || '';
            financialHtml += financials.meansOfFinance || '';
            financialHtml += financials.profitabilityAnalysis || '';
            financialHtml += financials.cashFlowStatement || '';
            financialHtml += financials.loanRepaymentSchedule || '';
            financialHtml += financials.breakEvenAnalysis || '';
            
            template = template.replace(placeholder, financialHtml);

            // Inject chart data into the script
            const costData = JSON.stringify(financials.costBreakdown || []);
            const yearlyData = JSON.stringify(financials.yearlyProjections || []);
            template = template.replace(`'{{COST_BREAKDOWN_DATA}}'`, costData);
            template = template.replace(`'{{YEARLY_PROJECTIONS_DATA}}'`, yearlyData);

        } else if (typeof section.content === 'string') {
            // Handle simple string content
            template = template.replace(new RegExp(placeholder, 'g'), section.content);
        }
    }
    
    // Clean up any remaining placeholders
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
