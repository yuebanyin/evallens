import type { Case, ModelResult } from './types';

/**
 * Sanity Check — the "test the test" gate.
 *
 * In industrial benchmark pipelines, a model's output is meaningless if the
 * case itself is malformed or the output trivially violates structural
 * constraints. This module performs cheap, deterministic checks BEFORE we
 * let an LLM judge or a human reviewer spend cycles on the result.
 *
 * Two layers:
 *   1. Case-level checks  — is the case authored correctly?
 *   2. Output-level checks — does the model output satisfy declared constraints?
 */

export interface SanityVerdict {
  passed: boolean;
  reasons: string[];
}

/** Validate the case definition itself (Build gate). */
export function checkCase(c: Case): SanityVerdict {
  const reasons: string[] = [];
  if (!c.prompt.trim()) reasons.push('Prompt is empty.');
  if (c.prompt.length > 20_000) reasons.push('Prompt is suspiciously long (>20k chars).');
  if (c.outputSchema === 'json' && !c.expected) {
    reasons.push('JSON output expected but no `expected` reference provided.');
  }
  return { passed: reasons.length === 0, reasons };
}

/** Validate a single model output against the case constraints (Sanity gate). */
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

/** Convenience: annotate a ModelResult in place. */
export function annotateSanity(c: Case, r: Omit<ModelResult, 'sanity'>): ModelResult {
  return { ...r, sanity: checkOutput(c, r.output) };
}
