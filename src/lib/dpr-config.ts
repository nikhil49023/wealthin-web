
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
  prompt: string;
};

// These prompts are enhanced to use data from the initial analysis (`idea.fullAnalysis`).
export const dprSectionConfig: DprSection[] = [
  {
    key: 'executiveSummary',
    title: 'Executive Summary',
    icon: FileText,
    description: 'A high-level overview of the entire project.',
    prompt: `Based on this data: {{idea}}, generate a 200-word Executive Summary for a bank DPR. The summary MUST be formal and professional. It must include the project's primary objective from {{idea.businessDescription}}, the total capital required, the means of finance (debt/equity ratio), and key projected financial metrics from {{idea.fullAnalysis.roi}}. The output MUST be a clean HTML string using only <p> and <strong> tags. Do not include any other text outside the HTML content.`,
  },
  {
    key: 'projectIntroduction',
    title: 'Project Introduction',
    icon: Briefcase,
    description: 'Detailed background of the business and its objectives.',
    prompt: `Using the context from {{idea}}, generate the "Project Introduction" section for a bank DPR. Structure the content with <h3> sub-headings for "Industry Overview", "Project Rationale", and "Business Objectives". Elaborate on the business from {{idea.businessDescription}} and the market gap it fills based on {{idea.fullAnalysis.targetAudience}}. The output MUST be a clean HTML string using only <p>, <h3>, <ul>, <li>, and <strong> tags.`,
  },
  {
    key: 'promoterDetails',
    title: 'Promoter Details',
    icon: User,
    description: 'Information about the entrepreneur(s).',
    prompt: `Generate the "Promoter Details" section for a bank DPR based on this data: {{idea}}. Create a professional biography for the promoter, highlighting their educational qualifications, years of relevant industry experience, and any past successes. Format key details like name, education, and experience using <strong> tags. The output MUST be a clean HTML string using only <p> and <strong> tags.`,
  },
   {
    key: 'businessModel',
    title: 'Business Model',
    icon: Building,
    description: 'How the business creates, delivers, and captures value.',
    prompt: `Generate the "Business Model" section for a bank DPR based on this data: {{idea}}. Use <h3> sub-headings for "Value Proposition", "Revenue Streams", and "Distribution Channels". Clearly explain how the business operates, using information from {{idea.fullAnalysis}}. The output MUST be a clean HTML string using only <p>, <h3>, <ul>, <li>, and <strong> tags.`,
  },
  {
    key: 'marketAnalysis',
    title: 'Market Analysis',
    icon: Target,
    description: 'Analysis of the industry, market, and competition.',
    prompt: `Generate the "Market Analysis" section for a bank DPR using the context from {{idea.fullAnalysis.targetAudience}}. Provide an analysis using <h3> sub-headings for "Market Size & Growth", "Target Demographics", and "Competitor Landscape". Use bullet points (<ul>/<li>) for listing competitors. The output MUST be a clean HTML string using only <p>, <h3>, <ul>, <li>, and <strong> tags.`,
  },
   {
    key: 'locationAndSite',
    title: 'Location & Site',
    icon: MapPin,
    description: 'Details about the physical location of the business.',
    prompt: `Generate the "Location & Site" section for a bank DPR based on this data: {{idea}}. Describe the advantages of the chosen location, such as connectivity, proximity to suppliers/markets, and utility availability. Use a <ul> with <li> tags to list the key advantages. The output MUST be a clean HTML string using only <p>, <ul>, <li>, and <strong> tags.`,
  },
  {
    key: 'technicalFeasibility',
    title: 'Technical Feasibility',
    icon: FlaskConical,
    description: 'Technical aspects of the project, including machinery and processes.',
    prompt: `Generate the "Technical Feasibility" section for a bank DPR using information from {{idea.fullAnalysis.investmentStrategy}}. Use <h3> sub-headings for "Manufacturing Process", "Technology Utilized", and "Machinery & Capacity". Detail the key machinery requirements and planned capacity utilization. The output MUST be a clean HTML string using only <p>, <h3>, <ul>, <li>, and <strong> tags.`,
  },
   {
    key: 'implementationSchedule',
    title: 'Implementation Schedule',
    icon: Calendar,
    description: 'A timeline for project completion.',
    prompt: `Generate the "Implementation Schedule" as a timeline for a bank DPR based on this data: {{idea}}. List key milestones like Land Acquisition, Civil Works, Machinery Installation, Trial Run, and Commercial Production start date. The output MUST be a clean HTML string using only an <ul> with <li> tags.`,
  },
  {
    key: 'financialProjections',
    title: 'Financial Projections',
    icon: Banknote,
    description: "Projected financial statements and analysis.",
    prompt: `Generate the "Financial Projections" data for a bank DPR based on the ROI projections in {{idea.fullAnalysis.roi}}. The entire response must be a single, valid JSON object that strictly conforms to this schema: {"summaryText": "HTML string", "projectCost": "HTML string", "meansOfFinance": "HTML string", "costBreakdown": [{"name": "string", "value": number}], "yearlyProjections": [{"year": "string", "sales": number, "profit": number}], "profitabilityAnalysis": "HTML string", "cashFlowStatement": "HTML string", "loanRepaymentSchedule": "HTML string", "breakEvenAnalysis": "HTML string"}. Do NOT wrap it in markdown or other text. All text values must be HTML strings with professional formatting using <p>, <h3> and <strong> tags.`,
  },
  {
    key: 'swotAnalysis',
    title: 'SWOT Analysis',
    icon: ShieldAlert,
    description: 'Strengths, Weaknesses, Opportunities, Threats.',
    prompt: `Generate a "SWOT Analysis" for a bank DPR based on this data: {{idea}}. Provide 3-4 bullet points for each quadrant. The output MUST be a clean HTML string using <h3> for each quadrant title (Strengths, Weaknesses, Opportunities, and Threats) and <ul>/<li> for the points.`,
  },
  {
    key: 'regulatoryCompliance',
    title: 'Regulatory Compliance',
    icon: Gavel,
    description: 'Legal and regulatory requirements.',
    prompt: `Generate the "Regulatory & Legal Compliance" section for a bank DPR, using information from {{idea.fullAnalysis.legalRequirements}}. List the key regulatory requirements, such as tax registrations (GST), environmental clearances, and any industry-specific licenses, using a <ul> and <li> tags. The output MUST be a clean HTML string using only <p>, <ul>, and <li> tags.`,
  },
  {
    key: 'riskAssessment',
    title: 'Risk Assessment',
    icon: AlertTriangle,
    description: 'Potential risks and mitigation strategies.',
    prompt: `Generate the "Risk Assessment & Mitigation" section for a bank DPR based on this data: {{idea}}. Use <h3> sub-headings for "Market Risks", "Operational Risks", and "Financial Risks". For each risk, suggest a concrete mitigation strategy based on {{idea.fullAnalysis.futureProofing}}. The output MUST be a clean HTML string using <p>, <h3>, and <strong> tags.`,
  },
   {
    key: 'annexures',
    title: 'Annexures',
    icon: Paperclip,
    description: 'Supporting documents.',
    prompt: `Generate a list of typical supporting documents required for a DPR's annexure, based on this data: {{idea}}. The output MUST be a clean HTML string using an <ul> with <li> tags for the list.`,
  },
];
