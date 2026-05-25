import type { Case, ModelResult } from './types';

/**
 * Sanity Check —— 评分前的两道门。
 *
 * 真人做评测最容易踩的坑是：case 自己就有问题，或者模型输出明显不对劲（空、
 * 格式错、违反约束），然后还拿这种结果去打分，最后报告全是噪声。
 *
 * 所以这里做两层廉价的、确定性的检查，跑在任何 LLM-as-judge 或人工 review
 * 之前：
 *   1. checkCase   —— case 本身写得对不对（Build 门）
 *   2. checkOutput —— 模型输出有没有违反 case 声明的约束（Sanity 门）
 */

export interface SanityVerdict {
  passed: boolean;
  reasons: string[];
}

/** Build 门：检查 case 本身是否可用。 */
export function checkCase(c: Case): SanityVerdict {
  const reasons: string[] = [];
  if (!c.prompt.trim()) reasons.push('Prompt is empty.');
  if (c.prompt.length > 20_000) reasons.push('Prompt is suspiciously long (>20k chars).');
  if (c.outputSchema === 'json' && !c.expected) {
    reasons.push('JSON output expected but no `expected` reference provided.');
  }
  return { passed: reasons.length === 0, reasons };
}

/** Sanity 门：检查模型输出有没有违反 case 声明的约束。 */
export function checkOutput(c: Case, output: string): SanityVerdict {
  const reasons: string[] = [];
  const text = output ?? '';

  if (!text.trim()) {
    reasons.push('Output is empty.');
    return { passed: false, reasons };
  }

  // Schema-level checks
  if (c.outputSchema === 'json') {
    try {
      JSON.parse(stripCodeFence(text));
    } catch {
      reasons.push('Output declared as JSON but does not parse.');
    }
  }

  // Constraint checks
  const cn = c.constraints;
  if (cn?.maxChars && text.length > cn.maxChars) {
    reasons.push(`Output exceeds maxChars (${text.length} > ${cn.maxChars}).`);
  }
  if (cn?.mustContain?.length) {
    for (const needle of cn.mustContain) {
      if (!text.includes(needle)) reasons.push(`Missing required token: "${needle}".`);
    }
  }
  if (cn?.mustNotContain?.length) {
    for (const needle of cn.mustNotContain) {
      if (text.includes(needle)) reasons.push(`Contains forbidden token: "${needle}".`);
    }
  }

  return { passed: reasons.length === 0, reasons };
}

function stripCodeFence(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  return m ? m[1] : s;
}

/** 给一个还没跟 sanity 结论的 ModelResult 加上 sanity 字段。 */
export function annotateSanity(c: Case, r: Omit<ModelResult, 'sanity'>): ModelResult {
  return { ...r, sanity: checkOutput(c, r.output) };
}
