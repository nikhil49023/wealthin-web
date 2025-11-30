
import type { GenerateRagAnswerInput } from '@/ai/schemas/rag-answer';
import fetch from 'node-fetch';

class CatalystService {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private projectId: string;
  private orgId: string;

  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.clientId = process.env.ZOHO_CLIENT_ID!;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET!;
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN!;
    this.projectId = process.env.ZOHO_PROJECT_ID!;
    this.orgId = process.env.ZOHO_CATALYST_ORG_ID!;

    if (!this.clientId || !this.clientSecret || !this.refreshToken || !this.projectId || !this.orgId) {
        console.error("CRITICAL: One or more Zoho Catalyst environment variables are not configured.");
    }
  }

  private async getValidAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl = 'https://accounts.zoho.in/oauth/v2/token';
    const params = new URLSearchParams();
    params.append('refresh_token', this.refreshToken);
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);
    params.append('grant_type', 'refresh_token');

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        body: params,
      });

      const data: any = await response.json();

      if (data.error) {
        throw new Error(`Zoho token refresh failed: ${data.error}`);
      }

      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(new Date().getTime() + (data.expires_in - 300) * 1000); 

      return this.accessToken!;
    } catch (error: any) {
      throw new Error(`Failed to refresh Zoho access token: ${error.message}`);
    }
  }

  public async generateText(prompt: string, system_prompt: string = "Be concise and factual"): Promise<any> {
    const token = await this.getValidAccessToken();
    const chatApiUrl = `https://api.catalyst.zoho.in/quickml/v2/project/${this.projectId}/llm/chat`;
    
    const body = {
      "prompt": prompt,
      "model": "crm-di-qwen_text_14b-fp8-it",
      "system_prompt": system_prompt,
      "top_p": 0.9,
      "top_k": 50,
      "best_of": 1,
      "temperature": 0.7,
      "max_tokens": 2048
    };

    const apiResponse = await fetch(chatApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CATALYST-ORG': this.orgId,
        'Authorization': `Zoho-oauthtoken ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error('Zoho LLM API request failed with status:', apiResponse.status);
      console.error('Zoho LLM API response body:', errorBody);
      throw new Error(`Zoho LLM API request failed: ${apiResponse.statusText}`);
    }

    const responseData: any = await apiResponse.json();
    return responseData?.response;
  }

  public async generateTextFromImage(prompt: string, base64Images: string[]): Promise<any> {
    const token = await this.getValidAccessToken();
    const vlmApiUrl = `https://api.catalyst.zoho.in/quickml/v1/project/${this.projectId}/vlm/chat`;
    
    const body = {
      "prompt": prompt,
      "model": "VL-Qwen2.5-7B",
      "images": base64Images,
      "system_prompt": "You are a strict JSON data extraction engine. You MUST return ONLY the raw JSON object. Do not use Markdown code blocks (```). Do not write any conversational text. Ensure all amount fields are Numbers, not Strings.",
      "top_k": 50,
      "top_p": 0.9,
      "temperature": 0.7,
      "max_tokens": 1024
    };

    const apiResponse = await fetch(vlmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CATALYST-ORG': this.orgId,
        'Authorization': `Zoho-oauthtoken ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error('Zoho VLM API request failed with status:', apiResponse.status);
      console.error('Zoho VLM API response body:', errorBody);
      throw new Error(`Zoho VLM API request failed: ${apiResponse.statusText}`);
    }
    
    const responseData: any = await apiResponse.json();
    return responseData?.response;
  }
}

const catalystService = new CatalystService();
export default catalystService;
