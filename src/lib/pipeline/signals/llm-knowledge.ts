/**
 * LLM Knowledge Analyst — uses the LLM's training data as a signal source.
 *
 * This is NOT the same as the LLM interpreting signals (Step 4).
 * This generates STRUCTURED MARKET INTELLIGENCE as raw data:
 * - Real competitor names, pricing, user counts
 * - Market size estimates with sources
 * - Known failure patterns in this space
 * - Distribution channel analysis
 *
 * The output is treated as signal_evidence alongside HackerNews data.
 */

import { callWithFallback } from '@/lib/pipeline/ai/retry';
import type { SignalResult } from '@/types/pipeline';
import type { SignalCategory } from '@/types/database';
import type { SignalProvider, SignalQuery } from './types';
import { logger } from '@/lib/logger';

const COMPETITOR_PROMPT = `You are a startup market research analyst. Given a startup idea, identify REAL existing competitors and alternatives.

Return valid JSON:
{
  "competitors": [
    {
      "name": "Otter.ai",
      "description": "AI meeting transcription and notes",
      "pricing": "$16.99/user/month pro plan",
      "estimated_users": "25M+ users",
      "strengths": "Brand recognition, integrations",
      "weaknesses": "No action item tracking, no task integration",
      "funding": "Series B, $63M raised",
      "url": "https://otter.ai"
    }
  ],
  "market_size": {
    "estimate": "$3.5B meeting productivity market",
    "growth": "Growing 15% annually",
    "source": "Grand View Research estimates"
  },
  "failed_startups": [
    {
      "name": "Voicea (acquired by Cisco)",
      "reason": "Couldn't compete independently, acquired for technology"
    }
  ],
  "distribution_insights": "B2B SaaS in this space primarily acquires through product-led growth and integrations marketplace listings",
  "key_risks": ["Commoditization risk as AI transcription becomes a feature not a product", "Big tech (Google, Microsoft) building native solutions"]
}

RULES:
- Only include REAL companies and data you're confident about
- If you don't know exact numbers, say "estimated" or "approximately"
- Include at least 3 competitors if they exist
- Include at least 1 failed/acquired startup if relevant
- Be specific with pricing, not vague`;

const MARKET_VALIDATION_PROMPT = `You are a startup validation expert. Given a startup idea and its target market, assess the real-world demand signals.

Return valid JSON:
{
  "demand_signals": [
    {
      "signal": "Zoom reported 300M daily meeting participants in 2023",
      "relevance": "Massive addressable market for meeting tools",
      "strength": "strong"
    }
  ],
  "urgency_signals": [
    {
      "signal": "Remote work adoption increased 300% post-COVID and remains high",
      "relevance": "Meeting overload is a growing problem",
      "strength": "strong"
    }
  ],
  "monetization_signals": [
    {
      "signal": "Fireflies.ai charges $19/user/month and has paying enterprise customers",
      "relevance": "Validates willingness to pay for meeting AI tools",
      "strength": "moderate"
    }
  ],
  "execution_risks": [
    {
      "risk": "Speech recognition accuracy varies significantly across accents and languages",
      "severity": "medium"
    }
  ]
}

RULES:
- Only cite REAL data points you're confident about
- Each signal should reference a real company, study, or market event
- Strength: "strong" = well-documented, "moderate" = likely true, "weak" = anecdotal`;

/**
 * LLM Knowledge as a SignalProvider for use with the provider registry.
 */
export const llmKnowledgeProvider: SignalProvider = {
  name: 'llm_knowledge',
  collect: collectLLMKnowledge,
};

export async function collectLLMKnowledge(query: SignalQuery): Promise<SignalResult[]> {
  const signals: SignalResult[] = [];
  const ideaContext = `Problem: ${query.problem}\nSolution: ${query.solution}\nTarget user: ${query.target_user}\nCategory: ${query.category}`;

  // 1. Competitor Analysis
  try {
    const { text: compText } = await callWithFallback({
      prompt: `Analyze this startup idea:\n${ideaContext}\n\nIdentify real competitors, market size, and failed startups in this space.`,
      systemInstruction: COMPETITOR_PROMPT,
      temperature: 0.3,
      maxTokens: 2048,
    });

    const compData = JSON.parse(compText);

    // Each competitor becomes a signal
    if (compData.competitors) {
      for (const comp of compData.competitors) {
        signals.push({
          source_type: 'llm_knowledge',
          signal_category: 'competition' as SignalCategory,
          raw_data: comp,
          normalized_summary: `Competitor: ${comp.name} — ${comp.description}. Pricing: ${comp.pricing}. Users: ${comp.estimated_users}`,
          source_url: comp.url ?? null,
        });
      }
    }

    // Market size as a signal
    if (compData.market_size) {
      signals.push({
        source_type: 'llm_knowledge',
        signal_category: 'demand' as SignalCategory,
        raw_data: compData.market_size,
        normalized_summary: `Market size: ${compData.market_size.estimate}. Growth: ${compData.market_size.growth}`,
        source_url: null,
      });
    }

    // Failed startups as signals
    if (compData.failed_startups) {
      for (const failed of compData.failed_startups) {
        signals.push({
          source_type: 'llm_knowledge',
          signal_category: 'execution' as SignalCategory,
          raw_data: failed,
          normalized_summary: `Failed/Acquired: ${failed.name} — ${failed.reason}`,
          source_url: null,
        });
      }
    }

    // Distribution insight
    if (compData.distribution_insights) {
      signals.push({
        source_type: 'llm_knowledge',
        signal_category: 'distribution' as SignalCategory,
        raw_data: { insight: compData.distribution_insights },
        normalized_summary: compData.distribution_insights,
        source_url: null,
      });
    }

    // Key risks
    if (compData.key_risks) {
      for (const risk of compData.key_risks) {
        signals.push({
          source_type: 'llm_knowledge',
          signal_category: 'competition' as SignalCategory,
          raw_data: { risk },
          normalized_summary: `Risk: ${risk}`,
          source_url: null,
        });
      }
    }
  } catch (e) {
    logger.warn('LLM Knowledge competitor analysis failed', { provider: 'llm_knowledge', error: (e as Error).message });
  }

  // 2. Market Validation Signals
  try {
    const { text: mktText } = await callWithFallback({
      prompt: `Assess real-world market signals for this idea:\n${ideaContext}`,
      systemInstruction: MARKET_VALIDATION_PROMPT,
      temperature: 0.3,
      maxTokens: 1536,
    });

    const mktData = JSON.parse(mktText);

    const signalTypes: [string, string][] = [
      ['demand_signals', 'demand'],
      ['urgency_signals', 'urgency'],
      ['monetization_signals', 'monetization'],
    ];

    for (const [key, category] of signalTypes) {
      const items = mktData[key];
      if (Array.isArray(items)) {
        for (const item of items) {
          signals.push({
            source_type: 'llm_knowledge',
            signal_category: category as SignalCategory,
            raw_data: item,
            normalized_summary: `${item.signal} — ${item.relevance}`,
            source_url: null,
          });
        }
      }
    }

    if (Array.isArray(mktData.execution_risks)) {
      for (const risk of mktData.execution_risks) {
        signals.push({
          source_type: 'llm_knowledge',
          signal_category: 'execution' as SignalCategory,
          raw_data: risk,
          normalized_summary: `Execution risk: ${risk.risk} (${risk.severity})`,
          source_url: null,
        });
      }
    }
  } catch (e) {
    logger.warn('LLM Knowledge market validation failed', { provider: 'llm_knowledge', error: (e as Error).message });
  }

  return signals;
}
