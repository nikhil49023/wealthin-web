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
    description: "A high-level overview of the entire project.",
    prompt: `Generate the Executive Summary for a bank DPR. The output must be a single JSON object with a "content" key holding the HTML string. Here is the project data: {{idea}}`,
  },
  {
    key: 'projectIntroduction',
    title: 'Project Introduction',
    icon: Briefcase,
    description: "Detailed background of the business and its objectives.",
    prompt: `Generate the Project Introduction for a bank DPR. The output must be a single JSON object with a "content" key holding the HTML string. Here is the project data: {{idea}}`,
  },
  {
    key: 'promoterDetails',
    title: 'Promoter Details',
    icon: User,
    description: "Information about the entrepreneur(s).",
    prompt: `Generate the Promoter Details section for a bank DPR. The output must be a single JSON object with a "content" key holding the HTML string. Here is the promoter data: {{idea}}`,
  },
   {
    key: 'businessModel',
    title: 'Business Model',
    icon: Building,
    description: "How the business creates, delivers, and captures value.",
    prompt: `Generate the Business Model section for a bank DPR. The output must be a single JSON object with a "content" key holding the HTML string. Here is the business data: {{idea}}`,
  },
  {
    key: 'marketAnalysis',
    title: 'Market Analysis',
    icon: Target,
    description: "Analysis of the industry, market, and competition.",
    prompt: `Generate the Market Analysis for a bank DPR. The output must be a single JSON object with a "content" key holding the HTML string. Here is the market data: {{idea}}`,
  },
   {
    key: 'locationAndSite',
    title: 'Location & Site',
    icon: MapPin,
    description: "Details about the physical location of the business.",
    prompt: `Generate the Location & Site Details section for a bank DPR. The output must be a single JSON object with a "content" key holding the HTML string. Here is the location data: {{idea}}`,
  },
  {
    key: 'technicalFeasibility',
    title: 'Technical Feasibility',
    icon: FlaskConical,
    description: "Technical aspects of the project, including machinery and processes.",
    prompt: `Generate the Technical Feasibility section for a bank DPR. The output must be a single JSON object with a "content" key holding the HTML string. Here is the project data: {{idea}}`,
  },
   {
    key: 'implementationSchedule',
    title: 'Implementation Schedule',
    icon: Calendar,
    description: "A timeline for project completion.",
    prompt: `Generate the Implementation Schedule section for a bank DPR. The output must be a single JSON object with a "content" key holding the HTML string. Here is the project data: {{idea}}`,
  },
  {
    key: 'financialProjections',
    title: 'Financial Projections',
    icon: Banknote,
    description: "Projected financial statements and analysis.",
    prompt: `Generate the Financial Projections for a bank DPR. The entire response must be a single, valid JSON object that strictly conforms to the schema (do NOT wrap it in markdown or other text). Here is the financial data: {{idea}}`,
  },
  {
    key: 'swotAnalysis',
    title: 'SWOT Analysis',
    icon: TrendingUp,
    description: "Strengths, Weaknesses, Opportunities, Threats.",
    prompt: `Generate a SWOT Analysis for a bank DPR. The output must be a single JSON object with a "content" key holding the HTML string. Here is the project data: {{idea}}`,
  },
  {
    key: 'regulatoryCompliance',
    title: 'Regulatory Compliance',
    icon: BookOpen,
    description: "Legal and regulatory requirements.",
    prompt: `Generate the Regulatory & Legal Compliance section for a bank DPR. The output must be a single JSON object with a "content" key holding the HTML string. Here is the project data: {{idea}}`,
  },
  {
    key: 'riskAssessment',
    title: 'Risk Assessment',
    icon: Shield,
    description: "Potential risks and mitigation strategies.",
    prompt: `Generate the Risk Assessment and Mitigation section for a bank DPR. The output must be a single JSON object with a "content" key holding the HTML string. Here is the project data: {{idea}}`,
  },
   {
    key: 'annexures',
    title: 'Annexures',
    icon: Paperclip,
    description: "Supporting documents.",
    prompt: `List the necessary supporting documents for a DPR annexure. The output must be a single JSON object with a "content" key holding the HTML string. Here is the project data: {{idea}}`,
  },
];
