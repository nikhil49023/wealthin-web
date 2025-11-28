
'use server';
/**
 * @fileOverview This flow is deprecated. The new flow is generate-dpr-section.ts.
 * This file is kept to avoid breaking changes but is no longer used by the application.
 */
import type { GenerateDprInput, GenerateDprOutput } from '@/ai/schemas/dpr';


export async function generateDpr(
  input: GenerateDprInput
): Promise<GenerateDprOutput> {
  throw new Error(
    'This DPR generation flow is deprecated. Use the section-by-section generation flow instead.'
  );
}
