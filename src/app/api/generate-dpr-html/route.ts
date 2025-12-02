
'use server';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { sections, quizData } = await req.json();

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
    template = template.replace(/{{PRODUCT_IMAGE_URL}}/g, quizData.productImageUrl || '');
    
    // --- Inject Sectional Content ---
    for (const section of sections) {
        let contentToInject = '';
        if (section.key === 'financialProjections' && typeof section.content === 'object') {
            // For financials, combine all HTML parts into one block
            const financialData = section.content;
            contentToInject = `
                <div class="prose max-w-none text-gray-700 outline-none" contenteditable="true">
                    ${financialData.summaryText || ''}
                    ${financialData.projectCost || ''}
                    ${financialData.meansOfFinance || ''}
                    ${financialData.profitabilityAnalysis || ''}
                    ${financialData.cashFlowStatement || ''}
                    ${financialData.loanRepaymentSchedule || ''}
                    ${financialData.breakEvenAnalysis || ''}
                </div>
            `;
        } else if (typeof section.content === 'string') {
            contentToInject = section.content;
        }

        const placeholder = `{{${section.key.toUpperCase()}}}`;
        template = template.replace(new RegExp(placeholder, 'g'), contentToInject);
    }
    
    // Clean up any remaining placeholders
    template = template.replace(/\{\{[A-Z_]+\}\}/g, '<p>Not generated.</p>');

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
