import { z } from 'zod';

/**
 * 整个项目的核心数据模型都在这里。
 * 用 Zod 是为了后续用户自定义 case / API 接入时能拿到一道免费的运行时校验。
 */

/** 一条评测用例。 */
export const CaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  dimension: z.enum(['ui', 'bug', 'feature', 'doc', 'security', 'custom']),
  prompt: z.string().min(1),
  /** 参考答案 / 验收说明，供 sanity check 和后续 LLM judge 参考。 */
  expected: z.string().optional(),
  /** 结果期望的输出形式。 */
  outputSchema: z.enum(['text', 'json', 'code']).default('text'),
  /** 软约束：最大长度、必须包含的关键字等。 */
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

/** 目前支持的 provider 底座。 */
export const ProviderIdSchema = z.enum(['openai', 'anthropic', 'mock']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

/** 分数的来源：heuristic（占位） / llm-judge（一个模型给另一个模型打分） / human（人工 override）。 */
export const ScoreSourceSchema = z.enum(['heuristic', 'llm-judge', 'human']);
export type ScoreSource = z.infer<typeof ScoreSourceSchema>;

/** 一次模型调用的结果。 */
export const ModelResultSchema = z.object({
  provider: ProviderIdSchema,
  model: z.string(),
  output: z.string(),
  latencyMs: z.number(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  costUsd: z.number().optional(),
  error: z.string().optional(),
  sanity: z.object({
    passed: z.boolean(),
    reasons: z.array(z.string()),
  }),
  /** rubric 打分，每个维度 0..5。 */
  scores: z.record(z.number()).optional(),
  /** 分数来源；未设置时按 heuristic 处理。 */
  scoreSource: ScoreSourceSchema.optional(),
  /** LLM judge 模型 id（仅 scoreSource = llm-judge 时填）。 */
  judgeModel: z.string().optional(),
  /** LLM judge 给出的简短理由，便于人工 cross-check。 */
  judgeNotes: z.string().optional(),
});
export type ModelResult = z.infer<typeof ModelResultSchema>;

/** 一次完整的 run：一个 case × N 个模型。 */
export const RunSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  caseSnapshot: CaseSchema,
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  results: z.array(ModelResultSchema),
});
export type Run = z.infer<typeof RunSchema>;

export interface RubricDimension {
  key: string;
  label: string;
  description: string;
}
