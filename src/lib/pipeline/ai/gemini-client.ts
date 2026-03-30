/**
 * Gemini API wrapper — Flash for fast tasks, Pro for deep reasoning.
 *
 * Flash (gemini-2.0-flash): Steps 1, 2 — interpretation, clarification
 * Pro (gemini-2.5-flash-preview-05-20): Steps 4, 7 — signal interpretation, report generation
 *
 * All calls have:
 *  - 30s timeout via AbortController
 *  - Try-catch with structured error messages
 *  - Env var validation at call time (not module load)
 */

import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai';
import { logger } from '@/lib/logger';

/** Timeout for all Gemini API calls (30 seconds). */
const LLM_TIMEOUT_MS = 30_000;

export interface GeminiCallOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
}

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('[Gemini] GEMINI_API_KEY is not set. Cannot call Gemini API.');
  }
  return new GoogleGenerativeAI(key);
}

/**
 * Internal helper — calls a Gemini model with timeout and error handling.
 */
async function callModel(
  modelName: string,
  options: GeminiCallOptions,
  jsonMode: boolean
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: options.systemInstruction,
  });

  const config: GenerationConfig = {
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxTokens ?? 2048,
    ...(jsonMode && { responseMimeType: 'application/json' }),
  };

  // AbortController for timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const result = await model.generateContent(
      {
        contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
        generationConfig: config,
      },
      { signal: controller.signal }
    );

    const text = result.response.text();
    if (!text || text.trim().length === 0) {
      throw new Error(`[Gemini/${modelName}] Received empty response from model.`);
    }

    return text;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw Object.assign(
        new Error(`[Gemini/${modelName}] Request timed out after ${LLM_TIMEOUT_MS}ms`),
        { status: 408 }
      );
    }

    // Preserve status code for retry logic
    const err = error as { status?: number; message?: string };
    if (err.status) {
      throw Object.assign(
        new Error(`[Gemini/${modelName}] API error (${err.status}): ${err.message ?? 'Unknown'}`),
        { status: err.status }
      );
    }

    throw new Error(
      `[Gemini/${modelName}] Unexpected error: ${(error as Error).message ?? String(error)}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call Gemini Flash — fast, cheap, good for interpretation and clarification.
 * Used in Steps 1, 2.
 */
export async function callGeminiFlash(options: GeminiCallOptions): Promise<string> {
  return callModel('gemini-2.0-flash', options, true);
}

/**
 * Call Gemini Pro — stronger reasoning, for signal interpretation and report generation.
 * Used in Steps 4, 7.
 *
 * Uses gemini-2.5-flash-preview-05-20 — the best available reasoning model
 * on the free tier. Previously had a bug where this called Flash (BUG-001, fixed).
 */
export async function callGeminiPro(options: GeminiCallOptions): Promise<string> {
  return callModel('gemini-2.5-flash-preview-04-17', options, true);
}

/**
 * Call Gemini Flash with plain text response (non-JSON).
 * Used for quick roast and other text-only outputs.
 */
export async function callGeminiFlashText(options: GeminiCallOptions): Promise<string> {
  return callModel('gemini-2.0-flash', options, false);
}
