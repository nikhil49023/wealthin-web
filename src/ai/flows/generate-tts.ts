
'use server';
/**
 * @fileOverview This flow is for text-to-speech.
 * Note: The current AI provider does not support TTS.
 * This flow is a placeholder and will not produce audio.
 * A full implementation would require a dedicated TTS service.
 */

import type {GenerateTtsInput, GenerateTtsOutput} from '@/ai/schemas/tts';

export async function generateTts(
  input: GenerateTtsInput
): Promise<GenerateTtsOutput> {
  console.warn(
    'TTS flow is a placeholder. No audio will be generated.'
  );

  // Returning a silent/empty audio data URI to prevent the app from crashing.
  const emptyWavBase64 =
    'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA==';
  return Promise.resolve({
    audioDataUri: `data:audio/wav;base64,${emptyWavBase64}`,
  });
}
