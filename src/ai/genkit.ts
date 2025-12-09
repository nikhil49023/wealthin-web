
'use server';
/**
 * @fileoverview This file initializes the Genkit AI instance with necessary plugins.
 * It's the central point for configuring generative AI capabilities in the application.
 */

import {genkit, type Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {firebase} from '@genkit-ai/firebase';
import {genkitEval} from 'genkitx-eval';
import * as path from 'path';
import {z} from 'zod';

// This is the new, correct place for initializing environment-dependent services.
const requiredVars = {
    ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN,
    ZOHO_PROJECT_ID: process.env.ZOHO_PROJECT_ID,
    ZOHO_CATALYST_ORG_ID: process.env.ZOHO_CATALYST_ORG_ID,
};

const missingVars = Object.entries(requiredVars).filter(([key, value]) => !value);

if (missingVars.length > 0) {
    const isVercel = process.env.VERCEL;
    const missingVarKeys = missingVars.map(([key]) => key).join(', ');
    const errorMessage = `CRITICAL RUNTIME ERROR: The following environment variables are missing: [${missingVarKeys}].`;
    
    if (isVercel) {
        // In Vercel, env vars need to be set in the project settings.
        // Throwing here will crash the build, which is what we want if config is missing.
        throw new Error(`${errorMessage} Please set them in your Vercel project's Environment Variables settings.`);
    } else {
        // In other environments, we can log a warning.
        // The app will likely fail later when AI features are used.
        console.warn(errorMessage, "AI features will not work.");
    }
}


export const ai: Genkit = genkit({
  plugins: [
    firebase(),
    googleAI(),
    genkitEval({
      judge: 'googleai/gemini-1.5-flash',
      metrics: ['reasoning', 'coherence'],
      judgeConfig: {
        safetySettings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      },
    }),
  ],
  flowStateStore: 'firebase',
  traceStore: 'firebase',
  enableTracing: true,
  logLevel: 'debug',
});
