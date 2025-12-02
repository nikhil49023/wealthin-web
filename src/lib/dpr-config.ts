
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
  MapPin,
  Gavel,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

type DprSection = {
  key: string;
  title: string;
  icon: React.ElementType;
  description: string;
  prompt: string; // This will now be a template string
};

// These prompts are based on the user-provided templates.
// The {{idea}} placeholder will be replaced with the stringified JSON of the form data.
export const dprSectionConfig: DprSection[] = [
  {
    key: 'executiveSummary',
    title: 'Executive Summary',
    icon: FileText,
    description: 'A high-level overview of the entire project.',
    prompt: `Generate a 200-word Executive Summary for a bank DPR based on this data: {{idea}}. The summary MUST be formal and professional. It must include the project's primary objective, the total capital required, the means of finance (debt/equity ratio), and key projected financial metrics like ROI or DSCR. The output MUST be a clean HTML string using only <p> and <strong> tags. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
  {
    key: 'projectIntroduction',
    title: 'Project Introduction',
    icon: Briefcase,
    description: 'Detailed background of the business and its objectives.',
    prompt: `Generate the "Project Introduction" section for a bank DPR using this data: {{idea}}. The section should provide a detailed background of the industry/sector, the specific rationale for this project (e.g., market gap), and its long-term objectives. The output MUST be a clean HTML string using only <p>, <h3>, <ul>, <li>, and <strong> tags. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
  {
    key: 'promoterDetails',
    title: 'Promoter Details',
    icon: User,
    description: 'Information about the entrepreneur(s).',
    prompt: `Generate the "Promoter Details" section for a bank DPR based on this data: {{idea}}. Create a professional biography for the promoter, highlighting their educational qualifications, years of relevant industry experience, and any past successes or track record. The output MUST be a clean HTML string using only <p> and <strong> tags. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
   {
    key: 'businessModel',
    title: 'Business Model',
    icon: Building,
    description: 'How the business creates, delivers, and captures value.',
    prompt: `Generate the "Business Model" section for a bank DPR based on this data: {{idea}}. Explain how the business will operate, including its value proposition, primary customer segments (e.g., B2B, B2C), key revenue streams, and distribution channels. The output MUST be a clean HTML string using only <p>, <h3>, <ul>, <li>, and <strong> tags. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
  {
    key: 'marketAnalysis',
    title: 'Market Analysis',
    icon: Target,
    description: 'Analysis of the industry, market, and competition.',
    prompt: `Generate the "Market Analysis" section for a bank DPR using this data: {{idea}}. Provide an analysis of the market size, projected growth rate (CAGR), the demand-supply gap the project aims to fill, and a brief overview of the competitor landscape. The output MUST be a clean HTML string using only <p>, <h3>, <ul>, <li>, and <strong> tags. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
   {
    key: 'locationAndSite',
    title: 'Location & Site',
    icon: MapPin,
    description: 'Details about the physical location of the business.',
    prompt: `Generate the "Location & Site" section for a bank DPR based on this data: {{idea}}. Describe the advantages of the chosen location, such as connectivity (road/rail), proximity to raw material suppliers or customer markets, and the availability of essential utilities like water and power. The output MUST be a clean HTML string using only <p> and <strong> tags. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
  {
    key: 'technicalFeasibility',
    title: 'Technical Feasibility',
    icon: FlaskConical,
    description: 'Technical aspects of the project, including machinery and processes.',
    prompt: `Generate the "Technical Feasibility" section for a bank DPR using this data: {{idea}}. Detail the technical aspects, including the manufacturing process flow, the technology selected, key machinery requirements, and the planned capacity utilization for the initial years. The output MUST be a clean HTML string using only <p>, <h3>, <ul>, <li>, and <strong> tags. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
   {
    key: 'implementationSchedule',
    title: 'Implementation Schedule',
    icon: Calendar,
    description: 'A timeline for project completion.',
    prompt: `Generate the "Implementation Schedule" as a timeline for a bank DPR based on this data: {{idea}}. Include key milestones like Land Acquisition, Civil Works, Machinery Installation, Trial Run, and the final Commercial Production start date. The output MUST be a clean HTML string using only an <ul> with <li> tags. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
  {
    key: 'financialProjections',
    title: 'Financial Projections',
    icon: Banknote,
    description: "Projected financial statements and analysis.",
    prompt: `Generate the "Financial Projections" data for a bank DPR based on this data: {{idea}}. The entire response must be a single, valid JSON object that strictly conforms to this schema: {"summaryText": "HTML string", "projectCost": "HTML string", "meansOfFinance": "HTML string", "costBreakdown": [{"name": "string", "value": number}], "yearlyProjections": [{"year": "string", "sales": number, "profit": number}], "profitabilityAnalysis": "HTML string", "cashFlowStatement": "HTML string", "loanRepaymentSchedule": "HTML string", "breakEvenAnalysis": "HTML string"}. Do NOT wrap it in markdown or other text. All text values must be HTML strings.`,
  },
  {
    key: 'swotAnalysis',
    title: 'SWOT Analysis',
    icon: ShieldAlert,
    description: 'Strengths, Weaknesses, Opportunities, Threats.',
    prompt: `Generate a "SWOT Analysis" for a bank DPR based on this data: {{idea}}. Provide 3-4 bullet points for each quadrant (Strengths, Weaknesses, Opportunities, and Threats). The output MUST be a clean HTML string using <h3> for each quadrant title and <ul>/<li> for the points. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
  {
    key: 'regulatoryCompliance',
    title: 'Regulatory Compliance',
    icon: Gavel,
    description: 'Legal and regulatory requirements.',
    prompt: `Generate the "Regulatory & Legal Compliance" section for a bank DPR using this data: {{idea}}. List the key regulatory requirements, such as tax registrations (GST), necessary environmental clearances, local municipal permissions, and any industry-specific licenses. The output MUST be a clean HTML string using only <p>, <ul>, and <li> tags. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
  {
    key: 'riskAssessment',
    title: 'Risk Assessment',
    icon: AlertTriangle,
    description: 'Potential risks and mitigation strategies.',
    prompt: `Generate the "Risk Assessment & Mitigation" section for a bank DPR based on this data: {{idea}}. Identify potential Market Risks, Operational Risks, and Financial Risks. For each risk, suggest a concrete mitigation strategy. The output MUST be a clean HTML string using <h3> for each risk category and <p> or <ul> for the content. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
   {
    key: 'annexures',
    title: 'Annexures',
    icon: Paperclip,
    description: 'Supporting documents.',
    prompt: `Generate a list of typical supporting documents required for a DPR's annexure, based on this data: {{idea}}. The output MUST be a clean HTML string using an <ul> with <li> tags. Do not include any JSON formatting, markdown, or any text outside of the HTML content itself.`,
  },
];
