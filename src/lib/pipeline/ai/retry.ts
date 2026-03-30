/**
 * Retry with exponential backoff + Gemini→Groq fallback.
 *
 * Flow: Gemini Flash (up to 3 attempts) → Groq Llama 3.3 (1 attempt) → throw
 *
 * For "Pro" calls (Steps 4, 7): uses callGeminiPro with the same fallback pattern.
 */

import { callGeminiFlash, callGeminiPro, type GeminiCallOptions } from './gemini-client';
import { callGroq } from './groq-client';
import { logger } from '@/lib/logger';

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  /** If true, uses Gemini Pro (2.5-flash-preview) instead of Flash. */
  usePro?: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return (error as { status: number }).status;
  }
  return undefined;
}

/**
 * Call Gemini with retry, falling back to Groq on total failure.
 * Returns { text, model } so callers know which provider was used.
 */
export async function callWithFallback(
  options: GeminiCallOptions,
  retryOptions?: RetryOptions
): Promise<{ text: string; model: string }> {
  const maxRetries = retryOptions?.maxRetries ?? 2;
  const baseDelay = retryOptions?.baseDelayMs ?? 1000;
  const geminiCall = retryOptions?.usePro ? callGeminiPro : callGeminiFlash;
  const modelName = retryOptions?.usePro ? 'gemini-2.5-flash-preview' : 'gemini-2.0-flash';

  let lastError: Error | undefined;

  // Try Gemini with retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const text = await geminiCall(options);
      return { text, model: modelName };
    } catch (error: unknown) {
      lastError = error as Error;
      const status = getErrorStatus(error);

      // Rate limit (429) or server error (500+) — retry with backoff
      if ((status === 429 || (status && status >= 500)) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        logger.warn('Gemini call failed, retrying', {
          action: 'llm_retry',
          model: modelName,
          attempt: attempt + 1,
          maxRetries,
          status,
          delayMs: Math.round(delay),
        });
        await sleep(delay);
        continue;
      }

      // Timeout (408) — retry once more
      if (status === 408 && attempt < maxRetries) {
        logger.warn('Gemini call timed out, retrying', {
          action: 'llm_timeout_retry',
          model: modelName,
          attempt: attempt + 1,
        });
        await sleep(baseDelay);
        continue;
      }

      // Non-retryable error or last attempt — fall through to Groq
      if (attempt === maxRetries) {
        logger.warn('Gemini exhausted retries, falling back to Groq', {
          action: 'llm_fallback',
          model: modelName,
          lastError: lastError.message,
        });
        break;
      }
    }
  }

  // Fallback to Groq
  try {
    const text = await callGroq({
      prompt: options.prompt,
      systemInstruction: options.systemInstruction,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      jsonMode: true,
    });
    return { text, model: 'groq-llama-3.3-70b' };
  } catch (groqError) {
    const msg = `All LLM providers failed. Gemini error: ${lastError?.message ?? 'unknown'}. Groq error: ${(groqError as Error).message}`;
    logger.error(msg, groqError as Error, { action: 'llm_total_failure' });
    throw new Error(msg);
  }
}
