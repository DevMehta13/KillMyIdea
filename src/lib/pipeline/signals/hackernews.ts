/**
 * HackerNews Algolia API — community signal source.
 * Free, no auth, no rate limit.
 *
 * Improved: 4 targeted searches instead of 2 generic ones.
 * Searches for: problem discussions, competitor mentions, market trends, Show HN launches.
 */

import type { SignalResult } from '@/types/pipeline';
import type { SignalCategory } from '@/types/database';
import type { SignalProvider, SignalQuery } from './types';
import { logger } from '@/lib/logger';

/** Timeout for HackerNews API calls (10 seconds). */
const SIGNAL_TIMEOUT_MS = 10_000;

interface HNHit {
  objectID: string;
  title?: string;
  story_text?: string;
  url?: string;
  points: number;
  num_comments: number;
  created_at: string;
  author: string;
}

interface HNSearchResponse {
  hits: HNHit[];
  nbHits: number;
}

async function searchHN(query: string, tags?: string, numericFilters?: string): Promise<HNHit[]> {
  const params = new URLSearchParams({
    query,
    hitsPerPage: '8',
    ...(tags && { tags }),
    ...(numericFilters && { numericFilters }),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SIGNAL_TIMEOUT_MS);
  const res = await fetch(`https://hn.algolia.com/api/v1/search?${params}`, {
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`HN API error: ${res.status}`);
  }

  const data: HNSearchResponse = await res.json();
  return data.hits;
}

function hitsToSignals(hits: HNHit[], signalCategory: SignalCategory | null): SignalResult[] {
  return hits
    .filter((h) => (h.points ?? 0) > 2 || (h.num_comments ?? 0) > 1)
    .slice(0, 6)
    .map((hit) => ({
      source_type: 'hackernews',
      signal_category: signalCategory,
      raw_data: {
        title: hit.title,
        points: hit.points,
        num_comments: hit.num_comments,
        author: hit.author,
        created_at: hit.created_at,
        url: hit.url,
        objectID: hit.objectID,
      },
      normalized_summary: hit.title ?? null,
      source_url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
    }));
}

function dedup(signals: SignalResult[], existing: SignalResult[]): SignalResult[] {
  const ids = new Set(existing.map((s) => (s.raw_data as Record<string, unknown>).objectID));
  return signals.filter((s) => !ids.has((s.raw_data as Record<string, unknown>).objectID));
}

// Extract short searchable keywords from problem/solution
function extractKeywords(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5)
    .join(' ');
}

export const hackernewsProvider: SignalProvider = {
  name: 'hackernews',

  async collect(query: SignalQuery): Promise<SignalResult[]> {
    const allSignals: SignalResult[] = [];
    const problemKw = extractKeywords(query.problem);
    const solutionKw = extractKeywords(query.solution);

    // Search 1: Problem/pain point discussions (demand signal)
    try {
      const hits = await searchHN(problemKw, 'story', 'points>5');
      allSignals.push(...hitsToSignals(hits, 'demand'));
    } catch (e) {
      logger.warn('HN problem search failed', { provider: 'hackernews', error: (e as Error).message });
    }

    // Search 2: Solution/product discussions (competition signal)
    try {
      const hits = await searchHN(solutionKw, 'story', 'points>5');
      allSignals.push(...dedup(hitsToSignals(hits, 'competition'), allSignals));
    } catch (e) {
      logger.warn('HN solution search failed', { provider: 'hackernews', error: (e as Error).message });
    }

    // Search 3: "Show HN" launches in this space (differentiation signal)
    try {
      const hits = await searchHN(`Show HN ${solutionKw}`, 'show_hn');
      allSignals.push(...dedup(hitsToSignals(hits, 'differentiation'), allSignals));
    } catch (e) {
      logger.warn('HN Show HN search failed', { provider: 'hackernews', error: (e as Error).message });
    }

    // Search 4: "Ask HN" for user needs (urgency signal)
    try {
      const hits = await searchHN(`Ask HN ${problemKw}`, 'ask_hn');
      allSignals.push(...dedup(hitsToSignals(hits, 'urgency'), allSignals));
    } catch (e) {
      logger.warn('HN Ask HN search failed', { provider: 'hackernews', error: (e as Error).message });
    }

    return allSignals.slice(0, 20);
  },
};
