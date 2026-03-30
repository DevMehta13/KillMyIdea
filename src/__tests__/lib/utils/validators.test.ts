import { describe, it, expect } from 'vitest';
import {
  quickRoastSchema,
  createIdeaSchema,
  updateIdeaSchema,
  pipelineStepSchema,
  submitClarificationSchema,
} from '@/lib/utils/validators';

describe('quickRoastSchema', () => {
  it('accepts valid idea', () => {
    const result = quickRoastSchema.safeParse({ idea: 'A valid startup idea description here' });
    expect(result.success).toBe(true);
  });

  it('rejects too short idea', () => {
    const result = quickRoastSchema.safeParse({ idea: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects missing idea', () => {
    const result = quickRoastSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('createIdeaSchema', () => {
  it('accepts valid idea with required fields', () => {
    const result = createIdeaSchema.safeParse({
      title: 'My Startup Idea',
      raw_input: 'A detailed description of my startup idea that is long enough',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional fields', () => {
    const result = createIdeaSchema.safeParse({
      title: 'My Idea',
      raw_input: 'Description of the idea with enough detail',
      target_user: 'Developers',
      problem_statement: 'Code review is slow',
    });
    expect(result.success).toBe(true);
  });

  it('rejects title too short', () => {
    const result = createIdeaSchema.safeParse({ title: 'AB', raw_input: 'Valid description here' });
    expect(result.success).toBe(false);
  });
});

describe('updateIdeaSchema', () => {
  it('accepts partial update', () => {
    const result = updateIdeaSchema.safeParse({ title: 'Updated Title' });
    expect(result.success).toBe(true);
  });

  it('rejects empty update', () => {
    const result = updateIdeaSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('pipelineStepSchema', () => {
  it('accepts valid UUID', () => {
    const result = pipelineStepSchema.safeParse({ run_id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = pipelineStepSchema.safeParse({ run_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('submitClarificationSchema', () => {
  it('accepts valid answers', () => {
    const result = submitClarificationSchema.safeParse({
      version_id: '550e8400-e29b-41d4-a716-446655440000',
      answers: [{ question_id: 'q1', answer: 'My answer here' }],
      skip: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts skip mode', () => {
    const result = submitClarificationSchema.safeParse({
      version_id: '550e8400-e29b-41d4-a716-446655440000',
      answers: [],
      skip: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects answer exceeding 2000 chars', () => {
    const result = submitClarificationSchema.safeParse({
      version_id: '550e8400-e29b-41d4-a716-446655440000',
      answers: [{ question_id: 'q1', answer: 'x'.repeat(2001) }],
      skip: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 6 answers', () => {
    const result = submitClarificationSchema.safeParse({
      version_id: '550e8400-e29b-41d4-a716-446655440000',
      answers: Array.from({ length: 7 }, (_, i) => ({ question_id: `q${i}`, answer: 'answer' })),
      skip: false,
    });
    expect(result.success).toBe(false);
  });
});
