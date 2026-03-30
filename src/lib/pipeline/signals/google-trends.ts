/**
 * Google Trends signal provider via SerpAPI (DEC-019).
 * Provides interest-over-time data for demand/urgency signals.
 * Free tier: 100 searches/month (~1 query per analysis).
 * Gracefully degrades when API key missing or quota exhausted.
 */

import type { SignalResult } from '@/types/pipeline';
import type { SignalCategory } from '@/types/database';
import type { SignalProvider, SignalQuery } from './types';
import { logger } from '@/lib/logger';

const SERPAPI_URL = 'https://serpapi.com/search.json';

/** Timeout for SerpAPI calls (10 seconds). */
const SIGNAL_TIMEOUT_MS = 10_000;

// ─── SerpAPI Google Trends Response Types ───────────────────────────────────

interface TrendsTimelineDataPoint {
  date: string;
  timestamp: string;
  values: { query: string; value: string; extracted_value: number }[];
}

interface TrendsRelatedQuery {
  query: string;
  value?: number;
  extracted_value?: number;
  link?: string;
}

interface SerpAPITrendsResponse {
  interest_over_time?: {
    timeline_data: TrendsTimelineDataPoint[];
    averages: { query: string; value: number }[];
  };
  related_queries?: {
    rising?: TrendsRelatedQuery[];
    top?: TrendsRelatedQuery[];
  };
  search_parameters?: {
    q: string;
    engine: string;
  };
  error?: string;
}

// ─── Trend Analysis Helpers ─────────────────────────────────────────────────

type TrendDirection = 'growing' | 'stable' | 'declining' | 'insufficient_data';

interface TrendAnalysis {
  direction: TrendDirection;
  current_value: number;
  average_value: number;
  peak_value: number;
  growth_pct: number; // % change from first half avg to second half avg
}

/**
 * Analyze the interest-over-time timeline to determine trend direction.
 */
function analyzeTrend(timeline: TrendsTimelineDataPoint[]): TrendAnalysis {
  if (!timeline || timeline.length < 4) {
    return {
      direction: 'insufficient_data',
      current_value: 0,
      average_value: 0,
      peak_value: 0,
      growth_pct: 0,
    };
  }

  const values = timeline.map(
    (dp) => dp.values?.[0]?.extracted_value ?? 0
  );

  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid);
  const secondHalf = values.slice(mid);

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const firstAvg = avg(firstHalf);
  const secondAvg = avg(secondHalf);
  const overallAvg = avg(values);
  const peak = Math.max(...values);
  const current = values[values.length - 1];

  const growthPct =
    firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

  let direction: TrendDirection = 'stable';
  if (growthPct > 20) direction = 'growing';
  else if (growthPct < -20) direction = 'declining';

  return {
    direction,
    current_value: current,
    average_value: Math.round(overallAvg),
    peak_value: peak,
    growth_pct: Math.round(growthPct),
  };
}

/**
 * Map trend direction to a demand signal strength hint.
 * Higher = stronger demand signal.
 */
function trendToStrengthHint(analysis: TrendAnalysis): string {
  if (analysis.direction === 'growing') return 'strong';
  if (analysis.direction === 'stable' && analysis.average_value > 40)
    return 'moderate';
  if (analysis.direction === 'declining') return 'weak';
  return 'moderate';
}

/**
 * Build a concise search term from the query.
 * Google Trends works best with 1-3 word terms.
 */
function buildTrendsTerm(query: SignalQuery): string {
  // Prefer solution keywords — that's what people search for
  const words = query.solution
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  // Take top 2-3 meaningful words
  return words.slice(0, 3).join(' ') || query.keywords[0] || query.problem.split(' ').slice(0, 3).join(' ');
}

// ─── Provider Implementation ────────────────────────────────────────────────

export const googleTrendsProvider: SignalProvider = {
  name: 'google_trends',

  async collect(query: SignalQuery): Promise<SignalResult[]> {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      logger.warn('SERPAPI_KEY not set, skipping trends signals', { provider: 'google_trends' });
      return [];
    }

    const signals: SignalResult[] = [];
    const searchTerm = buildTrendsTerm(query);

    if (!searchTerm.trim()) {
      logger.warn('No meaningful search term could be built', { provider: 'google_trends' });
      return [];
    }

    try {
      const params = new URLSearchParams({
        engine: 'google_trends',
        q: searchTerm,
        data_type: 'TIMESERIES',
        date: 'today 12-m', // Last 12 months
        api_key: apiKey,
      });

      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), SIGNAL_TIMEOUT_MS);
      const res = await fetch(`${SERPAPI_URL}?${params}`, {
        signal: controller.signal,
      });
      clearTimeout(fetchTimeout);

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        // 429 = quota exhausted, degrade gracefully
        if (res.status === 429) {
          logger.warn('SerpAPI quota exhausted, skipping', { provider: 'google_trends' });
          return [];
        }
        throw new Error(`SerpAPI error ${res.status}: ${errText}`);
      }

      const data: SerpAPITrendsResponse = await res.json();

      if (data.error) {
        logger.warn('Google Trends API returned error', { provider: 'google_trends', error: data.error });
        return [];
      }

      // 1. Interest Over Time → demand signal
      if (data.interest_over_time?.timeline_data) {
        const trend = analyzeTrend(data.interest_over_time.timeline_data);
        const strength = trendToStrengthHint(trend);

        signals.push({
          source_type: 'google_trends',
          signal_category: 'demand' as SignalCategory,
          raw_data: {
            search_term: searchTerm,
            direction: trend.direction,
            current_value: trend.current_value,
            average_value: trend.average_value,
            peak_value: trend.peak_value,
            growth_pct: trend.growth_pct,
            data_points: data.interest_over_time.timeline_data.length,
          },
          normalized_summary: `Google Trends for "${searchTerm}": ${trend.direction} trend (${trend.growth_pct > 0 ? '+' : ''}${trend.growth_pct}% over 12 months). Current interest: ${trend.current_value}/100, average: ${trend.average_value}/100. Signal strength: ${strength}.`,
          source_url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(searchTerm)}&date=today%2012-m`,
        });

        // Growing trend also maps to urgency (market timing)
        if (trend.direction === 'growing') {
          signals.push({
            source_type: 'google_trends',
            signal_category: 'urgency' as SignalCategory,
            raw_data: {
              search_term: searchTerm,
              direction: trend.direction,
              growth_pct: trend.growth_pct,
            },
            normalized_summary: `Rising search interest for "${searchTerm}" (+${trend.growth_pct}%) suggests growing market urgency.`,
            source_url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(searchTerm)}&date=today%2012-m`,
          });
        }

        // Declining trend signals potential concern for demand
        if (trend.direction === 'declining') {
          signals.push({
            source_type: 'google_trends',
            signal_category: 'demand' as SignalCategory,
            raw_data: {
              search_term: searchTerm,
              direction: 'declining',
              decline_pct: Math.abs(trend.growth_pct),
            },
            normalized_summary: `Declining search interest for "${searchTerm}" (${trend.growth_pct}%) may indicate shrinking demand.`,
            source_url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(searchTerm)}&date=today%2012-m`,
          });
        }
      }

      // 2. Related Rising Queries → distribution/differentiation signals
      if (data.related_queries?.rising) {
        const topRising = data.related_queries.rising.slice(0, 5);
        if (topRising.length > 0) {
          signals.push({
            source_type: 'google_trends',
            signal_category: 'distribution' as SignalCategory,
            raw_data: {
              rising_queries: topRising.map((q) => ({
                query: q.query,
                value: q.extracted_value ?? q.value,
              })),
            },
            normalized_summary: `Rising related searches: ${topRising.map((q) => `"${q.query}"`).join(', ')}. These indicate emerging user interest and potential distribution channels.`,
            source_url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(searchTerm)}&date=today%2012-m`,
          });
        }
      }

      // 3. Top Related Queries → competition signals
      if (data.related_queries?.top) {
        const topQueries = data.related_queries.top.slice(0, 5);
        if (topQueries.length > 0) {
          signals.push({
            source_type: 'google_trends',
            signal_category: 'competition' as SignalCategory,
            raw_data: {
              top_queries: topQueries.map((q) => ({
                query: q.query,
                value: q.extracted_value ?? q.value,
              })),
            },
            normalized_summary: `Top related searches: ${topQueries.map((q) => `"${q.query}"`).join(', ')}. These represent what users currently search for in this space.`,
            source_url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(searchTerm)}&date=today%2012-m`,
          });
        }
      }
    } catch (e) {
      logger.warn('Trends query failed', { provider: 'google_trends', error: (e as Error).message });
    }

    return signals;
  },
};
