/**
 * Serper.dev web search signal provider (DEC-018).
 * Provides real Google search results as market signals.
 * Free tier: 2,500 searches/month (~3 queries per analysis).
 */

import type { SignalResult } from '@/types/pipeline';
import type { SignalCategory } from '@/types/database';
import type { SignalProvider, SignalQuery } from './types';
import { logger } from '@/lib/logger';

const SERPER_API_URL = 'https://google.serper.dev/search';

/** Timeout for Serper API calls (10 seconds). */
const SIGNAL_TIMEOUT_MS = 10_000;

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  date?: string;
}

interface SerperResponse {
  organic: SerperResult[];
  searchParameters?: {
    q: string;
  };
}

/**
 * Call the Serper.dev search API.
 */
async function searchSerper(
  query: string,
  apiKey: string,
  num: number = 8
): Promise<SerperResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SIGNAL_TIMEOUT_MS);
  const res = await fetch(SERPER_API_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Serper API error ${res.status}: ${errorText}`);
  }

  const data: SerperResponse = await res.json();
  return data.organic ?? [];
}

/**
 * Extract short searchable keywords from text.
 */
function extractKeywords(text: string, maxWords: number = 5): string {
  return text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, maxWords)
    .join(' ');
}

/**
 * Convert Serper results to SignalResult format.
 */
function resultsToSignals(
  results: SerperResult[],
  signalCategory: SignalCategory,
  maxResults: number = 5
): SignalResult[] {
  return results.slice(0, maxResults).map((r) => ({
    source_type: 'serper' as const,
    signal_category: signalCategory,
    raw_data: {
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      position: r.position,
      date: r.date ?? null,
    },
    normalized_summary: `${r.title} — ${r.snippet}`,
    source_url: r.link,
  }));
}

/**
 * Deduplicate signals by URL.
 */
function dedup(signals: SignalResult[], existing: SignalResult[]): SignalResult[] {
  const urls = new Set(
    existing
      .map((s) => s.source_url)
      .filter(Boolean)
  );
  return signals.filter((s) => !s.source_url || !urls.has(s.source_url));
}

export const serperProvider: SignalProvider = {
  name: 'serper',

  async collect(query: SignalQuery): Promise<SignalResult[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      logger.warn('SERPER_API_KEY not set, skipping web search signals', { provider: 'serper' });
      return [];
    }

    const allSignals: SignalResult[] = [];
    const problemKw = extractKeywords(query.problem);
    const solutionKw = extractKeywords(query.solution);

    // Search 1: Problem/pain point → demand signals
    // "people struggling with X" or "X problem"
    try {
      const results = await searchSerper(
        `${problemKw} problem solution`,
        apiKey,
        6
      );
      allSignals.push(...resultsToSignals(results, 'demand'));
    } catch (e) {
      logger.warn('Serper problem search failed', { provider: 'serper', error: (e as Error).message });
    }

    // Search 2: Competitor/solution landscape → competition signals
    // "best X tools" or "X alternatives"
    try {
      const results = await searchSerper(
        `${solutionKw} alternatives competitors`,
        apiKey,
        6
      );
      allSignals.push(...dedup(resultsToSignals(results, 'competition'), allSignals));
    } catch (e) {
      logger.warn('Serper competitor search failed', { provider: 'serper', error: (e as Error).message });
    }

    // Search 3: Market/distribution → distribution + monetization signals
    // "X market size" or "how to sell X"
    try {
      const results = await searchSerper(
        `${solutionKw} market size pricing`,
        apiKey,
        6
      );
      allSignals.push(...dedup(resultsToSignals(results, 'distribution'), allSignals));
    } catch (e) {
      logger.warn('Serper market search failed', { provider: 'serper', error: (e as Error).message });
    }

    return allSignals.slice(0, 15);
  },
};
