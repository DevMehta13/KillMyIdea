/**
 * Groq API wrapper — Llama 3.3 70B as fallback when Gemini fails.
 *
 * All calls have:
 *  - 30s timeout (via SDK timeout option)
 *  - Env var validation
 *  - Explicit failure on empty/null responses (never return empty string)
 */

import Groq from 'groq-sdk';

/** Timeout for Groq API calls (30 seconds). */
const LLM_TIMEOUT_MS = 30_000;

export interface GroqCallOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

function getClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('[Groq] GROQ_API_KEY is not set. Cannot call Groq API.');
  }
  return new Groq({ apiKey: key, timeout: LLM_TIMEOUT_MS });
}

/**
 * Call Groq (Llama 3.3 70B) — used as fallback for Gemini.
 * Throws on empty response instead of returning empty string.
 */
export async function callGroq(options: GroqCallOptions): Promise<string> {
  const client = getClient();
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];

  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }
  messages.push({ role: 'user', content: options.prompt });

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      response_format: options.jsonMode !== false ? { type: 'json_object' } : undefined,
    });

    const text = completion.choices[0]?.message?.content;
    if (!text || text.trim().length === 0) {
      throw new Error('[Groq] Received empty or null response from model.');
    }

    return text;
  } catch (error: unknown) {
    // Groq SDK throws APIConnectionTimeoutError on timeout
    const errMsg = (error as Error).message ?? String(error);
    if (errMsg.includes('timed out') || errMsg.includes('timeout') || errMsg.includes('aborted')) {
      throw Object.assign(
        new Error(`[Groq] Request timed out after ${LLM_TIMEOUT_MS}ms`),
        { status: 408 }
      );
    }

    const err = error as { status?: number; message?: string };
    if (err.status) {
      throw Object.assign(
        new Error(`[Groq] API error (${err.status}): ${err.message ?? 'Unknown'}`),
        { status: err.status }
      );
    }

    throw new Error(`[Groq] Unexpected error: ${errMsg}`);
  }
}
