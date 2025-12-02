import {
  FileText,
  Briefcase,
  User,
  Building,
  Target,
  FlaskConical,
  Calendar,
  Banknote,
  TrendingUp,
  Shield,
  BookOpen,
  Paperclip,
} from 'lucide-react';

type DprSection = {
  key: string;
  title: string;
  icon: React.ElementType;
  description: string;
  prompt: string;
};

export const dprSectionConfig: DprSection[] = [
  {
    key: 'executiveSummary',
    title: 'Executive Summary',
    icon: FileText,
    description: "A high-level overview of the entire project.",
    prompt: `Write a concise and compelling Executive Summary. It should briefly introduce the business, the problem it solves, the target market, key financial highlights (like projected revenue for Year 1), and the funding required. This should be the last section you write but the first in the report.`,
  },
  {
    key: 'projectIntroduction',
    title: 'Project Introduction',
    icon: Briefcase,
    description: "Detailed background of the business and its objectives.",
    prompt: `Provide a detailed introduction to the project. Describe the business concept, its legal structure, the mission and vision, and the specific objectives of the project.`,
  },
  {
    key: 'promoterDetails',
    title: 'Promoter Details',
    icon: User,
    description: "Information about the entrepreneur(s).",
    prompt: `Detail the background of the promoter/founder. Include their name, educational qualifications, relevant experience, and the skills they bring to the business.`,
  },
   {
    key: 'businessModel',
    title: 'Business Model',
    icon: Building,
    description: "How the business creates, delivers, and captures value.",
    prompt: `Describe the business model in detail. How will the business make money? What are the key activities, resources, and partners? What is the value proposition?`,
  },
  {
    key: 'marketAnalysis',
    title: 'Market Analysis',
    icon: Target,
    description: "Analysis of the industry, market, and competition.",
    prompt: `Conduct a thorough market analysis. Describe the industry size and growth rate, the target market demographics, customer needs, and an analysis of key competitors, including their strengths and weaknesses.`,
  },
   {
    key: 'locationAndSite',
    title: 'Location & Site',
    icon: Building,
    description: "Details about the physical location of the business.",
    prompt: `Describe the proposed location for the business. Justify why this location is suitable (e.g., proximity to suppliers, customers, transport links). Provide details about the premises (owned/leased, size, layout).`,
  },
  {
    key: 'technicalFeasibility',
    title: 'Technical Feasibility',
    icon: FlaskConical,
    description: "Technical aspects of the project, including machinery and processes.",
    prompt: `Assess the technical feasibility. Detail the technology and machinery required, the production process from raw material to finished product, and the required capacity and efficiency levels.`,
  },
   {
    key: 'implementationSchedule',
    title: 'Implementation Schedule',
    icon: Calendar,
    description: "A timeline for project completion.",
    prompt: `Create a realistic project implementation schedule. Present it as a month-by-month timeline, detailing key milestones from setup and procurement to hiring and final launch.`,
  },
  {
    key: 'financialProjections',
    title: 'Financial Projections',
    icon: Banknote,
    description: "Projected financial statements and analysis.",
    prompt: `Generate detailed 5-year financial projections. This MUST include:
    - **summaryText**: A brief summary of the financial outlook in markdown.
    - **projectCost**: A markdown table detailing the total project cost (land, building, machinery, working capital).
    - **meansOfFinance**: A markdown table showing how the project will be financed (promoter's contribution, bank loan).
    - **costBreakdown**: A JSON array for a pie chart: [{ "name": "Machinery", "value": 500000 }, { "name": "Working Capital", "value": 200000 }].
    - **yearlyProjections**: A JSON array for a bar chart: [{ "year": "Year 1", "sales": 2000000, "profit": 500000 }].
    - **profitabilityAnalysis**: A markdown text explaining key ratios like Gross Profit Margin and Net Profit Margin.
    - **breakEvenAnalysis**: A markdown text calculating and explaining the break-even point.
    - **cashFlowStatement**: A summary of the projected cash flow statement in markdown format.
    - **loanRepaymentSchedule**: A markdown table showing the loan repayment schedule if applicable.`,
  },
  {
    key: 'swotAnalysis',
    title: 'SWOT Analysis',
    icon: TrendingUp,
    description: "Strengths, Weaknesses, Opportunities, Threats.",
    prompt: `Perform a SWOT analysis. Identify at least 3-4 points for each category: Strengths (internal advantages), Weaknesses (internal disadvantages), Opportunities (external factors to leverage), and Threats (external risks).`,
  },
  {
    key: 'regulatoryCompliance',
    title: 'Regulatory Compliance',
    icon: BookOpen,
    description: "Legal and regulatory requirements.",
    prompt: `Outline the key legal and regulatory requirements for the business in India. This should include necessary licenses, registrations (like GST, Udyam), and adherence to local and industry-specific regulations.`,
  },
  {
    key: 'riskAssessment',
    title: 'Risk Assessment',
    icon: Shield,
    description: "Potential risks and mitigation strategies.",
    prompt: `Identify potential risks to the business (e.g., market risk, operational risk, financial risk). For each risk, propose a clear and practical mitigation strategy.`,
  },
   {
    key: 'annexures',
    title: 'Annexures',
    icon: Paperclip,
    description: "Supporting documents.",
    prompt: `List the necessary supporting documents that would be attached as annexures. This could include promoter's ID proof, address proof, quotations for machinery, etc. Do not generate the documents themselves.`,
  },
];
