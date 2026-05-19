import { z } from 'zod';

/** A single evaluation case authored by the user. */
export const CaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  dimension: z.enum(['ui', 'bug', 'feature', 'doc', 'security', 'custom']),
  prompt: z.string().min(1),
  /** Free-form expected output / acceptance notes. Used by Sanity Check & judge. */
  expected: z.string().optional(),
  /** Optional schema the output must satisfy (used in Sanity Check). */
  outputSchema: z.enum(['text', 'json', 'code']).default('text'),
  /** Soft constraints — max chars / must-contain tokens etc. */
  constraints: z
    .object({
      maxChars: z.number().int().positive().optional(),
      mustContain: z.array(z.string()).optional(),
      mustNotContain: z.array(z.string()).optional(),
    })
    .partial()
    .optional(),
  tags: z.array(z.string()).default([]),
});
export type Case = z.infer<typeof CaseSchema>;

/** Provider identifiers supported by the runner. */
export const ProviderIdSchema = z.enum(['openai', 'anthropic', 'mock']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

/** One model invocation result. */
export const ModelResultSchema = z.object({
  provider: ProviderIdSchema,
  model: z.string(),
  output: z.string(),
  latencyMs: z.number(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  costUsd: z.number().optional(),
  error: z.string().optional(),
  /** Sanity-check verdict for this output. */
  sanity: z.object({
    passed: z.boolean(),
    reasons: z.array(z.string()),
  }),
  /** Rubric scores 0..5 per dimension. */
  scores: z.record(z.number()).optional(),
});
export type ModelResult = z.infer<typeof ModelResultSchema>;

/** A full run = one case × N models. */
export const RunSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  caseSnapshot: CaseSchema,
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  results: z.array(ModelResultSchema),
});
export type Run = z.infer<typeof RunSchema>;

/** Rubric dimension definition. */
export interface RubricDimension {
  key: string;
  label: string;
  description: string;
}
