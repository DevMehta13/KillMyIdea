/**
 * Central registry of all signal providers.
 * Replaces hardcoded provider list in 03-collect-signals.ts.
 * Adding/removing a provider = adding/removing from this registry.
 */

import type { SignalProvider } from './types';
import { hackernewsProvider } from './hackernews';
import { llmKnowledgeProvider } from './llm-knowledge';
import { serperProvider } from './serper';
import { googleTrendsProvider } from './google-trends';

export interface RegisteredProvider {
  provider: SignalProvider;
  enabled: boolean;
  required: boolean; // If false, failure doesn't affect pipeline
}

/**
 * All registered signal providers.
 * Order determines execution priority (all run in parallel regardless).
 */
export function getRegisteredProviders(): RegisteredProvider[] {
  return [
    {
      provider: hackernewsProvider,
      enabled: true,
      required: false,
    },
    {
      provider: llmKnowledgeProvider,
      enabled: true,
      required: false,
    },
    {
      provider: serperProvider,
      enabled: !!process.env.SERPER_API_KEY,
      required: false,
    },
    {
      provider: googleTrendsProvider,
      enabled: !!process.env.SERPAPI_KEY,
      required: false,
    },
  ];
}

/**
 * Get all enabled providers.
 */
export function getEnabledProviders(): SignalProvider[] {
  return getRegisteredProviders()
    .filter((rp) => rp.enabled)
    .map((rp) => rp.provider);
}
