/**
 * Idea category classifier — supports two modes (DEC-016):
 *   1. "llm" (default) — uses Gemini Flash for classification
 *   2. "ml" (optional) — calls HuggingFace Inference API with fine-tuned DistilBERT
 *
 * Mode is controlled by `admin_settings.classification_method` ("llm" | "ml").
 * LLM is always the fallback if ML mode fails.
 */

import { callWithFallback } from '@/lib/pipeline/ai/retry';
import { createAdminClient } from '@/lib/supabase/server';
import { IDEA_CATEGORIES } from '@/lib/constants';
import type { IdeaCategory } from '@/types/database';
import { logger } from '@/lib/logger';

// ─── LLM Classification ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a startup categorizer. Given a startup idea description, classify it into exactly one of these categories:
${IDEA_CATEGORIES.join(', ')}

Respond with valid JSON: {"category": "<one of the above>", "confidence": <0.0-1.0>}

Rules:
- Pick the SINGLE best-fit category
- Only use categories from the list above
- If unsure, use "other"`;

async function classifyWithLLM(
  prompt: string
): Promise<{ category: IdeaCategory; confidence: number }> {
  const { text } = await callWithFallback({
    prompt,
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 128,
  });

  const result = JSON.parse(text);
  const category = IDEA_CATEGORIES.includes(result.category)
    ? result.category
    : 'other';

  return {
    category: category as IdeaCategory,
    confidence: Math.max(0, Math.min(1, result.confidence ?? 0.5)),
  };
}

// ─── HuggingFace ML Classification ──────────────────────────────────────────

async function classifyWithML(
  text: string
): Promise<{ category: IdeaCategory; confidence: number }> {
  const hfToken = process.env.HF_API_TOKEN;
  const modelId = process.env.HF_MODEL_ID;

  if (!hfToken || !modelId) {
    throw new Error('HF_API_TOKEN and HF_MODEL_ID must be set for ML classification');
  }

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${modelId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    }
  );

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
  }

  const predictions = await response.json();

  // HuggingFace returns [[{label, score}, ...]] for classification
  const topPrediction = Array.isArray(predictions?.[0])
    ? predictions[0][0]
    : predictions?.[0];

  if (!topPrediction?.label) {
    throw new Error('Unexpected HuggingFace response format');
  }

  // Map HF label format (LABEL_0, LABEL_1, etc.) or direct category names
  let category: IdeaCategory = 'other';
  const label = topPrediction.label.toLowerCase();

  if (IDEA_CATEGORIES.includes(label as IdeaCategory)) {
    category = label as IdeaCategory;
  } else if (label.startsWith('label_')) {
    // HF default label format: LABEL_0, LABEL_1, etc.
    const idx = parseInt(label.replace('label_', ''));
    if (idx >= 0 && idx < IDEA_CATEGORIES.length) {
      category = IDEA_CATEGORIES[idx];
    }
  }

  return {
    category,
    confidence: Math.max(0, Math.min(1, topPrediction.score ?? 0.5)),
  };
}

// ─── Main Classifier ─────────────────────────────────────────────────────────

async function getClassificationMethod(): Promise<'llm' | 'ml'> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('admin_settings')
      .select('value')
      .eq('key', 'classification_method')
      .single();

    const method = typeof data?.value === 'string' ? data.value : 'llm';
    return method === 'ml' ? 'ml' : 'llm';
  } catch {
    return 'llm';
  }
}

export async function classifyIdeaCategory(
  rawInput: string,
  targetUser: string | null,
  problemStatement: string | null
): Promise<{ category: IdeaCategory; confidence: number; method: 'llm' | 'ml' }> {
  const prompt = [
    `Idea: ${rawInput}`,
    targetUser ? `Target user: ${targetUser}` : '',
    problemStatement ? `Problem: ${problemStatement}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const method = await getClassificationMethod();

  // Try the configured method first
  if (method === 'ml') {
    try {
      const result = await classifyWithML(prompt);
      return { ...result, method: 'ml' };
    } catch (e) {
      logger.warn('ML classification failed, falling back to LLM', { provider: 'huggingface', error: (e as Error).message });
    }
  }

  // Default / fallback: LLM
  try {
    const result = await classifyWithLLM(prompt);
    return { ...result, method: 'llm' };
  } catch {
    return { category: 'other', confidence: 0.3, method: 'llm' };
  }
}
