
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
    template = template.replace(/{{DATE}}/g, quizData.date || new Date().toLocaleDateString('en-GB'));
    template = template.replace(/{{LOGO_URL}}/g, quizData.logoUrl || '');
    template = template.replace(/{{PROMOTER_IMAGE_URL}}/g, quizData.productImageUrl || '');
    
    // --- Inject Sectional Content ---
    for (const section of sections) {
        const placeholder = `{{${section.key.toUpperCase()}}}`;
        // Basic check to see if content is already in an object/complex form
        const contentToInject = typeof section.content === 'string' ? section.content : JSON.stringify(section.content, null, 2);
        template = template.replace(new RegExp(placeholder, 'g'), contentToInject);
    }
    
    // Clean up any remaining placeholders
    template = template.replace(/\{\{[A-Z_]+\}\}/g, '<p class="text-muted-foreground italic">Content not generated for this section.</p>');

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
