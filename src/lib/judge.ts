import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { Case, ModelResult, ProviderId } from './types';
import { RUBRIC_DIMENSIONS } from './rubric';

/**
 * LLM-as-Judge：用一个模型按 rubric 给另一个模型的输出打分。
 *
 * 设计取舍：
 * - 只接 openai / anthropic 真模型，不让 mock 来"假装 judge"。如果没配 key，
 *   返回 null，调用方继续退化用 heuristic 分（保持页面不空）。
 * - prompt 强制 JSON-only 输出，解析时容错（去 code fence、抓首个 {...}）。
 * - 分数 clamp 到 0..5 整数，避免 judge 返回 7.3 这种奇怪值。
 */

export interface JudgeSpec {
  provider: Exclude<ProviderId, 'mock'>;
  model: string;
}

/**
 * 看环境变量 + 实际有的 key，挑一个能跑的 judge。
 * 默认偏好 openai（社区里大多数 G-Eval / MT-Bench 基线都是 GPT-4 系列）。
 */
export function defaultJudge(): JudgeSpec | null {
  const envProvider = process.env.JUDGE_PROVIDER as ProviderId | undefined;
  const envModel = process.env.JUDGE_MODEL;

  if (envProvider === 'openai' && process.env.OPENAI_API_KEY) {
    return { provider: 'openai', model: envModel || process.env.OPENAI_MODEL || 'gpt-4o' };
  }
  if (envProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      model: envModel || process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514',
    };
  }

  // auto：优先 openai
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', model: envModel || process.env.OPENAI_MODEL || 'gpt-4o' };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      model: envModel || process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514',
    };
  }
  return null;
}

export interface JudgeOutcome {
  scores: Record<string, number>;
  notes: string;
  model: string;
}

/**
 * 给一份 ModelResult 打分。
 * - 空输出 / sanity 没过：直接 skip，保留原 heuristic 分。
 * - judge 调用失败 / JSON 解析失败：返回 null，调用方自行 fallback。
 */
export async function judgeResult(
  c: Case,
  r: ModelResult,
  judge: JudgeSpec,
): Promise<JudgeOutcome | null> {
  if (!r.output?.trim()) return null;
  if (r.error) return null;

  const dims = RUBRIC_DIMENSIONS[c.dimension];
  const prompt = buildJudgePrompt(c, r.output, dims);

  let text = '';
  try {
    if (judge.provider === 'openai') {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await generateText({ model: openai(judge.model), prompt });
      text = res.text;
    } else {
      const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const res = await generateText({ model: anthropic(judge.model), prompt });
      text = res.text;
    }
  } catch {
    return null;
  }

  const parsed = parseJudgeJson(text);
  if (!parsed || !parsed.scores) return null;

  const scores: Record<string, number> = {};
  for (const d of dims) {
    const v = parsed.scores[d.key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      scores[d.key] = clamp(Math.round(v), 0, 5);
    }
  }
  if (Object.keys(scores).length === 0) return null;

  return {
    scores,
    notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 800) : '',
    model: judge.model,
  };
}

function buildJudgePrompt(
  c: Case,
  output: string,
  dims: { key: string; label: string; description: string }[],
): string {
  const dimList = dims
    .map((d) => `- ${d.key} (${d.label}): ${d.description}`)
    .join('\n');
  const exampleKeys = dims
    .map((d) => `"${d.key}": <integer 0..5>`)
    .join(', ');

  return [
    'You are an impartial evaluation judge. Score the candidate output against the task using the rubric.',
    '',
    `Task title: ${c.title}`,
    `Task dimension: ${c.dimension}`,
    'Task prompt:',
    '"""',
    c.prompt,
    '"""',
    '',
    c.expected ? `Reference / expected guidance:\n"""\n${c.expected}\n"""\n` : '',
    'Candidate output:',
    '"""',
    output,
    '"""',
    '',
    'Rubric dimensions (each scored 0..5, integers only):',
    dimList,
    '',
    'Return ONLY compact JSON of the exact shape (no prose, no code fences):',
    `{"scores": {${exampleKeys}}, "notes": "<one short paragraph <=400 chars summarizing why>"}`,
  ].join('\n');
}

function parseJudgeJson(s: string): { scores?: Record<string, number>; notes?: string } | null {
  const stripped = s.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    /* fall through */
  }
  const m = stripped.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
