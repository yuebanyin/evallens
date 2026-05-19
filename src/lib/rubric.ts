import type { Case, RubricDimension } from './types';

/**
 * 5-Dimension Rubric Templates
 *
 * Distilled from the evaluation matrix used internally at Microsoft CoreAI
 * Post-Training, generalized so non-ML users can pick the right preset for
 * their task without designing rubrics from scratch.
 */
export const RUBRIC_DIMENSIONS: Record<Case['dimension'], RubricDimension[]> = {
  ui: [
    { key: 'correctness', label: 'Correctness', description: 'Renders / behaves as specified.' },
    { key: 'a11y', label: 'Accessibility', description: 'Keyboard / ARIA / contrast.' },
    { key: 'responsive', label: 'Responsiveness', description: 'Adapts across viewports.' },
    { key: 'quality', label: 'Code quality', description: 'Idiomatic, no dead code.' },
    { key: 'completeness', label: 'Completeness', description: 'All sub-requirements covered.' },
  ],
  bug: [
    { key: 'rootCause', label: 'Root cause', description: 'Correctly identifies the cause.' },
    { key: 'fixCorrectness', label: 'Fix correctness', description: 'Patch resolves the bug.' },
    { key: 'noRegression', label: 'No regression', description: 'Does not break other paths.' },
    { key: 'minimal', label: 'Minimal diff', description: 'Change scope is appropriate.' },
    { key: 'explanation', label: 'Explanation', description: 'Reasoning is clear and accurate.' },
  ],
  feature: [
    { key: 'requirements', label: 'Requirements', description: 'Covers all stated requirements.' },
    { key: 'design', label: 'Design', description: 'API / structure is reasonable.' },
    { key: 'edgeCases', label: 'Edge cases', description: 'Handles obvious edge cases.' },
    { key: 'quality', label: 'Code quality', description: 'Readable, idiomatic.' },
    { key: 'tests', label: 'Tests', description: 'Includes or suggests tests.' },
  ],
  doc: [
    { key: 'accuracy', label: 'Accuracy', description: 'Technically correct.' },
    { key: 'clarity', label: 'Clarity', description: 'Easy to follow.' },
    { key: 'completeness', label: 'Completeness', description: 'Covers required sections.' },
    { key: 'examples', label: 'Examples', description: 'Useful, runnable examples.' },
    { key: 'tone', label: 'Tone', description: 'Appropriate for audience.' },
  ],
  security: [
    { key: 'identification', label: 'Identification', description: 'Spots the vulnerability.' },
    { key: 'severity', label: 'Severity', description: 'Calibrated severity.' },
    { key: 'mitigation', label: 'Mitigation', description: 'Provides concrete fix.' },
    { key: 'standards', label: 'Standards', description: 'References CWE/OWASP correctly.' },
    { key: 'falsePositive', label: 'Low false positive', description: 'Does not over-flag.' },
  ],
  custom: [
    { key: 'overall', label: 'Overall', description: 'Holistic quality.' },
  ],
};

/**
 * Heuristic auto-scoring (0..5) used in the MVP. It is intentionally
 * lightweight — meant to give immediate feedback and a radar chart out of
 * the box. Real production use should pair this with LLM-as-judge.
 */
export function heuristicScore(c: Case, output: string): Record<string, number> {
  const dims = RUBRIC_DIMENSIONS[c.dimension];
  const scores: Record<string, number> = {};
  const text = output || '';

  // Length / structure signal
  const lengthSignal = Math.min(5, Math.max(1, Math.round(text.length / 240)));

  // Expected overlap signal (very rough Jaccard-ish on whitespace tokens)
  let overlap = 0;
  if (c.expected) {
    const a = new Set(tokenize(c.expected));
    const b = new Set(tokenize(text));
    const inter = [...a].filter((t) => b.has(t)).length;
    overlap = a.size ? inter / a.size : 0;
  }
  const overlapScore = Math.round(1 + overlap * 4);

  // Constraint signal
  let penalty = 0;
  if (c.constraints?.mustContain) {
    for (const t of c.constraints.mustContain) if (!text.includes(t)) penalty++;
  }
  if (c.constraints?.mustNotContain) {
    for (const t of c.constraints.mustNotContain) if (text.includes(t)) penalty += 2;
  }
  const constraintScore = Math.max(1, 5 - penalty);

  // Distribute signals across dimensions, slightly varied to avoid flat radar
  dims.forEach((d, i) => {
    const base =
      i % 3 === 0 ? overlapScore : i % 3 === 1 ? constraintScore : lengthSignal;
    scores[d.key] = clamp(base + ((i % 2) - 0.5), 1, 5);
  });
  return scores;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}
