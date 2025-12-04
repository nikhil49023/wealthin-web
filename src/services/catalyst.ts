
'use server';

import type { GenerateRagAnswerInput } from '@/ai/schemas/rag-answer';
import fetch from 'node-fetch';

class CatalystService {
  private clientId?: string;
  private clientSecret?: string;
  private refreshToken?: string;
  private projectId?: string;
  private orgId?: string;

  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private isInitialized = false;

  constructor() {
    // Initialization is deferred to the first API call.
  }

  private initialize() {
    if (this.isInitialized) {
      return;
    }
    
    const requiredVars = {
      ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
      ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
      ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN,
      ZOHO_PROJECT_ID: process.env.ZOHO_PROJECT_ID,
      ZOHO_CATALYST_ORG_ID: process.env.ZOHO_CATALYST_ORG_ID,
    };

    const missingVars = Object.entries(requiredVars).filter(([key, value]) => !value);

    if (missingVars.length > 0) {
      const missingVarKeys = missingVars.map(([key]) => key).join(', ');
      throw new Error(
        `CRITICAL RUNTIME ERROR: The following environment variables are missing from the deployment environment: [${missingVarKeys}]. Please set them in your hosting provider's configuration.`
      );
    }

    this.clientId = requiredVars.ZOHO_CLIENT_ID;
    this.clientSecret = requiredVars.ZOHO_CLIENT_SECRET;
    this.refreshToken = requiredVars.ZOHO_REFRESH_TOKEN;
    this.projectId = requiredVars.ZOHO_PROJECT_ID;
    this.orgId = requiredVars.ZOHO_CATALYST_ORG_ID;

    this.isInitialized = true;
  }

  private async getValidAccessToken(): Promise<string> {
    this.initialize(); 

    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl = 'https://accounts.zoho.in/oauth/v2/token';
    const params = new URLSearchParams();
    params.append('refresh_token', this.refreshToken!);
    params.append('client_id', this.clientId!);
    params.append('client_secret', this.clientSecret!);
    params.append('grant_type', 'refresh_token');

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        body: params,
      });

      const data: any = await response.json();

      if (data.error) {
        if (data.error === 'invalid_client') {
            console.error("Zoho 'invalid_client' error: This usually means ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET are incorrect in the deployment environment. Please verify your hosting provider's environment variable settings.");
        }
        throw new Error(`Zoho token refresh failed: ${data.error}`);
      }

      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(new Date().getTime() + (data.expires_in - 300) * 1000); 

      return this.accessToken!;
    } catch (error: any) {
      throw new Error(`Failed to refresh Zoho access token: ${error.message}`);
    }
  }

  public async generateText(prompt: string, system_prompt: string = "Be concise and factual", model: string = "crm-di-qwen_text_14b-fp8-it"): Promise<any> {
    const token = await this.getValidAccessToken();
    const chatApiUrl = `https://api.catalyst.zoho.in/quickml/v2/project/${this.projectId}/llm/chat`;
    
    const body = {
      "prompt": prompt,
      "model": model,
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
        'CATALYST-ORG': this.orgId!,
        'Authorization': `Bearer ${token}`,
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

    if (responseData && responseData.response) {
      return responseData.response;
    } else {
      throw new Error('AI response did not contain a "response" field.');
    }
  }

  public async generateTextFromImage(prompt: string, base64Images: string[], system_prompt: string): Promise<any> {
    const token = await this.getValidAccessToken();
    const vlmApiUrl = `https://api.catalyst.zoho.in/quickml/v1/project/${this.projectId}/vlm/chat`;
    
    const body = {
      "prompt": prompt,
      "model": "VL-Qwen2.5-7B",
      "images": base64Images,
      "system_prompt": system_prompt,
      "top_k": 50,
      "top_p": 0.9,
      "temperature": 0.7,
      "max_tokens": 1024
    };

    const apiResponse = await fetch(vlmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CATALYST-ORG': this.orgId!,
        'Authorization': `Bearer ${token}`,
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
    if (responseData && responseData.response) {
        return responseData.response;
    } else {
        throw new Error('AI vision response did not contain a "response" field.');
    }
  }
}

// --- Lazy-loading Singleton Pattern ---
let catalystServiceInstance: CatalystService | null = null;

function getCatalystService(): CatalystService {
    if (!catalystServiceInstance) {
        catalystServiceInstance = new CatalystService();
    }
    return catalystServiceInstance;
}

// Export the public methods as async functions
export const generateText = async (prompt: string, system_prompt?: string, model?: string): Promise<any> => {
  return getCatalystService().generateText(prompt, system_prompt, model);
};

export const generateTextFromImage = async (prompt: string, base64Images: string[], system_prompt: string): Promise<any> => {
  return getCatalystService().generateTextFromImage(prompt, base64Images, system_prompt);
};
