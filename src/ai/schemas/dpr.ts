
import {z} from 'zod';

// This is the schema for the data collected from the new interactive quiz
export const DprQuizDataSchema = z.object({
  projectName: z.string().describe("The name of the business or project."),
  businessType: z.string().describe("The type of business (e.g., Manufacturing, Services, Trading)."),
  companyName: z.string().optional().describe("The legal name of the company, if applicable."),
  businessDescription: z.string().describe("A brief, 1-2 sentence description of what the business does."),
  
  location: z.string().describe("The city and state where the business will operate."),
  siteDetails: z.string().describe("Whether the business premises will be 'Owned' or 'Leased'."),
  registrationType: z.string().describe("The legal structure of the business (e.g., Sole Proprietorship)."),
  
  promoterName: z.string().describe("The full name of the entrepreneur/founder."),
  education: z.string().describe("The highest educational qualification of the promoter."),
  experience: z.string().describe("A brief summary of the promoter's relevant work experience."),
  
  projectCost: z.number().describe("The total estimated cost to start the project."),
  workingCapital: z.number().optional().describe("The funds required for day-to-day operations."),
  loanAmount: z.number().describe("The amount of loan required from a bank or financial institution."),
  promoterContribution: z.number().optional().describe("The amount of capital being invested by the promoter."),

  revenueY1: z.number().describe("The projected sales/revenue for the first year of operation."),
  profitMargin: z.number().describe("The expected net profit margin as a percentage."),
  growthRate: z.number().optional().describe("The expected year-on-year growth rate."),

  targetMarket: z.string().describe("A description of the ideal customer profile."),
  competitors: z.string().describe("A brief overview of the main competitors."),
  marketingStrategy: z.string().describe("The primary strategy for reaching customers."),

  risks: z.string().describe("A comma-separated list of potential business risks."),
  mitigation: z.string().describe("The plan to manage or mitigate the identified risks."),

  logoUrl: z.string().optional().describe("A URL to the business logo image."),
  productImageUrl: z.string().optional().describe("A URL to an image of the product or service.")
});
export type DprQuizData = z.infer<typeof DprQuizDataSchema>;


// Schema for the final AI-generated DPR output
export const FinancialProjectionsSchema = z.object({
  summaryText: z.string().describe('A brief summary of the financial outlook in HTML format.'),
  projectCost: z.string().describe('Breakdown of total project costs in HTML format.'),
  meansOfFinance: z.string().describe('How the project will be financed (equity, debt) in HTML format.'),
  costBreakdown: z.array(z.object({name: z.string(), value: z.number()})).describe('A JSON array for a pie chart of cost breakdown.'),
  yearlyProjections: z.array(z.object({year: z.string(), sales: z.number(), profit: z.number()})).describe('A JSON array for a bar chart of yearly sales and profit.'),
  profitabilityAnalysis: z.string().describe('Analysis of profitability in HTML format.'),
  cashFlowStatement: z.string().describe('Projected cash flow statement in HTML format.'),
  loanRepaymentSchedule: z.string().describe('Loan repayment schedule in HTML format.'),
  breakEvenAnalysis: z.string().describe('Break-even point analysis in HTML format.'),
});

export const GenerateDprOutputSchema = z.object({
  executiveSummary: z.string().describe('Must be an HTML string.'),
  projectIntroduction: z.string().describe('Must be an HTML string.'),
  promoterDetails: z.string().describe('Must be an HTML string.'),
  businessModel: z.string().describe('Must be an HTML string.'),
  marketAnalysis: z.string().describe('Must be an HTML string.'),
  locationAndSite: z.string().describe('Must be an HTML string.'),
  technicalFeasibility: z.string().describe('Must be an HTML string.'),
  implementationSchedule: z.string().describe('Must be an HTML string.'),
  financialProjections: FinancialProjectionsSchema,
  swotAnalysis: z.string().describe('Must be an HTML string.'),
  regulatoryCompliance: z.string().describe('Must be an HTML string.'),
  riskAssessment: z.string().describe('Must be an HTML string.'),
  annexures: z.string().describe('Must be an HTML string.'),
});
export type GenerateDprOutput = z.infer<typeof GenerateDprOutputSchema>;
