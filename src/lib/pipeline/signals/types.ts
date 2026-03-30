/**
 * Signal provider interface — modular pattern per DEC-011.
 * Adding/removing a provider must not require changes to pipeline steps.
 */

import type { SignalResult } from '@/types/pipeline';

export interface SignalProviderConfig {
  enabled: boolean;
}

export interface SignalQuery {
  problem: string;
  solution: string;
  target_user: string;
  category: string;
  keywords: string[];
}

export interface SignalProvider {
  name: string;
  collect(query: SignalQuery): Promise<SignalResult[]>;
}
