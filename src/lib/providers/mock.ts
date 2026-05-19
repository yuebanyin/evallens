import type { Case, ModelResult } from '../types';
import { annotateSanity } from '../sanity-check';
import { heuristicScore } from '../rubric';

/**
 * A deterministic mock provider. Used when no API keys are configured so the
 * product can be demoed end-to-end. Different model ids produce different
 * "personalities" so the compare view still looks meaningful.
 */
export async function runMock(c: Case, model: string): Promise<ModelResult> {
  const started = Date.now();
  await sleep(200 + Math.random() * 600);

  const text = synthesize(c, model);
  const result = annotateSanity(c, {
    provider: 'mock',
    model,
    output: text,
    latencyMs: Date.now() - started,
    inputTokens: c.prompt.length / 4,
    outputTokens: text.length / 4,
  });
  result.scores = heuristicScore(c, text);
  return result;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function synthesize(c: Case, model: string): string {
  const careful = model.includes('careful');
  const header = careful
    ? `# ${c.title}\n\n_Analysis (model: ${model})_\n\n`
    : `Quick take (${model}):\n\n`;

  const body =
    c.dimension === 'bug'
      ? `Suspected root cause: the handler does not guard against ${pick(c, ['null', 'undefined', 'race condition', 'stale state'])}.\n\n` +
        `Suggested patch:\n\n\`\`\`ts\nif (!value) return;\n// ...\n\`\`\``
      : c.dimension === 'security'
      ? `Likely issue: untrusted input flows into ${pick(c, ['innerHTML', 'eval', 'shell command'])}.\n\nMitigation: validate + escape, prefer parameterized APIs (CWE-79 / CWE-78).`
      : c.dimension === 'doc'
      ? `## Overview\n\nThis section explains the API surface.\n\n## Example\n\n\`\`\`ts\nconst x = api.call({ ... });\n\`\`\``
      : c.dimension === 'ui'
      ? `<button class="px-4 py-2 rounded bg-indigo-600 text-white" aria-label="${c.title}">${c.title}</button>`
      : `Proposed implementation:\n\n\`\`\`ts\nexport function solution(input: unknown) {\n  // 1. validate\n  // 2. transform\n  // 3. return\n}\n\`\`\``;

  const tail = careful
    ? '\n\nTrade-offs considered: readability vs perf; chose readability.'
    : '';

  return header + body + tail;
}

function pick(c: Case, options: string[]): string {
  // deterministic-ish based on prompt length
  return options[c.prompt.length % options.length];
}
