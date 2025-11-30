
'use server';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { generateDprSection } from '@/ai/flows/generate-dpr-section';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';

type DprSection = {
  key: string;
  title: string;
  prompt: string;
};

const getDprSections = (
  idea: GenerateInvestmentIdeaAnalysisOutput
): DprSection[] => [
  {
    key: 'executiveSummary',
    title: 'Executive Summary',
    prompt: `Write a compelling Executive Summary for a Detailed Project Report. The business is "${idea.title}". The summary should be concise, covering the business concept, market opportunity, financial highlights, and the promoter's vision. It should be tailored for a bank loan application in India.`,
  },
  {
    key: 'introduction',
    title: 'Introduction & Background',
    prompt: `Write the 'Introduction and Background' section for a DPR. Describe the business "${idea.title}". Explain the problem it solves, its value proposition, and the overall vision. Include background on the industry in India.`,
  },
  {
    key: 'marketAnalysis',
    title: 'Market Analysis',
    prompt: `Write the 'Market Analysis' section for a DPR. The business is "${idea.title}". Detail the target market size, growth trends, customer segments, and key competitors in India. Use the following context: ${idea.targetAudience}`,
  },
  {
    key: 'technicalFeasibility',
    title: 'Technical Feasibility',
    prompt: `Write the 'Technical Feasibility' section for a DPR for "${idea.title}". Describe the core technology, operational processes, required equipment, and scalability of the solution. Use the following context: ${idea.investmentStrategy}`,
  },
  {
    key: 'financials',
    title: 'Financials',
    prompt: `Generate the 'Financial Projections' section for a DPR for "${idea.title}". The output must be a well-structured set of HTML tables covering: 1. Project Cost & Means of Finance, 2. Projected Profit & Loss for 5 years, 3. Debt Service Coverage Ratio (DSCR) for 5 years, and 4. Break-Even Point Analysis. Use realistic figures for a small-to-medium scale business in India. Base your projections on this context: ${idea.investmentStrategy} and ${idea.roi}`,
  },
  {
    key: 'conclusion',
    title: 'Conclusion',
    prompt: `Write a strong 'Conclusion' for the DPR for "${idea.title}". Summarize the project's viability, reiterate the key strengths, and make a formal request for the bank loan.`,
  },
];

export async function POST(req: Request) {
  try {
    const { idea, promoterName } = await req.json();

    if (!idea || !promoterName) {
      return NextResponse.json(
        { message: 'Idea analysis and promoter name are required' },
        { status: 400 }
      );
    }

    const sectionsToGenerate = getDprSections(idea);

    const generationPromises = sectionsToGenerate.map(section =>
      generateDprSection({
        idea: idea,
        promoterName: promoterName,
        section: section.title,
        basePrompt: section.prompt,
      }).then(result => ({
        key: section.key,
        content: result.content,
      }))
    );

    const generatedSections = await Promise.all(generationPromises);

    const dprData: { [key: string]: any } = {};
    generatedSections.forEach(section => {
      dprData[section.key] = section.content;
    });

    // 1. Read the HTML template
    const templatePath = path.join(process.cwd(), 'src', 'app', 'dpr-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    // 2. Inject promoter name and idea title
    template = template.replace(
      /\{\{promoterName\}\}/g,
      promoterName
    );
    template = template.replace(/\{\{ideaTitle\}\}/g, idea.title);

    // 3. Inject generated sections
    for (const key in dprData) {
      template = template.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        dprData[key]
      );
    }
    
     // Add editable wrapper and script to the template
    template = template.replace('</body>', `
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const sections = ['executiveSummary', 'introduction', 'marketAnalysis', 'technicalFeasibility', 'financials', 'conclusion'];
            sections.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.setAttribute('contenteditable', 'true');
                    element.setAttribute('data-section-id', id);
                    element.style.outline = 'none';
                    element.style.padding = '5px';
                    element.style.border = '1px dashed transparent';

                    element.addEventListener('focus', () => {
                        element.style.border = '1px dashed #3b82f6';
                    });
                    element.addEventListener('blur', () => {
                        element.style.border = '1px dashed transparent';
                        // Save content logic
                        try {
                            localStorage.setItem('dpr-edit-' + id, element.innerHTML);
                        } catch(e) {
                            console.error('Could not save content to localStorage', e);
                        }
                    });

                    // Load saved content
                    try {
                        const savedContent = localStorage.getItem('dpr-edit-' + id);
                        if (savedContent) {
                            element.innerHTML = savedContent;
                        }
                    } catch (e) {
                         console.error('Could not load content from localStorage', e);
                    }
                }
            });
            
            // Add a function to the window to save all content
            window.saveAllDprContent = function() {
                sections.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        try {
                           localStorage.setItem('dpr-edit-' + id, element.innerHTML);
                        } catch(e) {
                           // ignore error
                        }
                    }
                });
                console.log('All DPR content saved to localStorage.');
            }
        });
    </script>
    </body>
    `);

    // 4. Return the final HTML
    return new NextResponse(template, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    console.error('Error in DPR HTML generation API:', error);
    return NextResponse.json(
      { message: `Failed to generate DPR: ${error.message}` },
      { status: 500 }
    );
  }
}
