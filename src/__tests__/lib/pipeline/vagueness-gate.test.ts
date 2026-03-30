import { describe, it, expect } from 'vitest';
import { checkVaguenessGate } from '@/lib/pipeline/vagueness-gate';

describe('checkVaguenessGate', () => {
  it('blocks when score >= 0.7', () => {
    const result = checkVaguenessGate(0.7);
    expect(result.blocked).toBe(true);
    expect(result.threshold).toBe(0.7);
  });

  it('blocks when score is 1.0', () => {
    const result = checkVaguenessGate(1.0, ['no problem stated', 'no target user']);
    expect(result.blocked).toBe(true);
    expect(result.vagueness_flags).toHaveLength(2);
  });

  it('allows when score < 0.7', () => {
    const result = checkVaguenessGate(0.69);
    expect(result.blocked).toBe(false);
  });

  it('allows when score is 0', () => {
    const result = checkVaguenessGate(0);
    expect(result.blocked).toBe(false);
  });

  it('returns the vagueness score and threshold', () => {
    const result = checkVaguenessGate(0.85, ['vague area']);
    expect(result.vagueness_score).toBe(0.85);
    expect(result.threshold).toBe(0.7);
    expect(result.vagueness_flags).toEqual(['vague area']);
  });

  it('defaults to empty flags array', () => {
    const result = checkVaguenessGate(0.5);
    expect(result.vagueness_flags).toEqual([]);
  });
});
