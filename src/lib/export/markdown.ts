import type { Run } from '../types';
import { RUBRIC_DIMENSIONS } from '../rubric';

/**
 * Markdown 报告：可以直接贴 Slack / PR / issue。
 * 优先级：尽量纯文本、有锚点感、不依赖任何外部资源。
 */
export function toMarkdown(run: Run): string {
  const c = run.caseSnapshot;
  const dims = RUBRIC_DIMENSIONS[c.dimension];

  const lines: string[] = [];
  lines.push(`# ${c.title}`);
  lines.push('');
  lines.push(`> EvalLens run — \`${run.id}\``);
  lines.push('');

  const meta: string[] = [];
  meta.push(`- **Dimension**: \`${c.dimension}\``);
  meta.push(`- **Output schema**: \`${c.outputSchema}\``);
  meta.push(`- **Models compared**: ${run.results.length}`);
  meta.push(`- **Started**: ${run.startedAt}`);
  if (run.finishedAt) meta.push(`- **Finished**: ${run.finishedAt}`);
  const judgeModel = pickJudgeModel(run);
  if (judgeModel) meta.push(`- **Score source**: \`llm-judge (${judgeModel})\``);
  else meta.push('- **Score source**: `heuristic`');
  lines.push(meta.join('\n'));
  lines.push('');

  // Prompt
  lines.push('## Prompt');
  lines.push('');
  lines.push('```');
  lines.push(c.prompt);
  lines.push('```');
  lines.push('');

  // Summary scores table
  lines.push('## Scores');
  lines.push('');
  const head = ['Model', ...dims.map((d) => d.label), 'Sanity'];
  lines.push(`| ${head.join(' | ')} |`);
  lines.push(`| ${head.map(() => '---').join(' | ')} |`);
  for (const r of run.results) {
    const row = [
      `\`${r.provider}/${r.model}\``,
      ...dims.map((d) => fmtScore(r.scores?.[d.key])),
      r.sanity.passed ? '✓' : '✗',
    ];
    lines.push(`| ${row.join(' | ')} |`);
  }
  lines.push('');

  // Per-result details
  lines.push('## Outputs');
  lines.push('');
  for (const r of run.results) {
    lines.push(`### ${r.provider}/${r.model}`);
    lines.push('');
    const stats: string[] = [
      `latency \`${r.latencyMs}ms\``,
      `in \`${r.inputTokens ?? '—'}\``,
      `out \`${r.outputTokens ?? '—'}\``,
      `source \`${r.scoreSource ?? 'heuristic'}\``,
    ];
    lines.push(stats.join(' · '));
    lines.push('');

    if (r.error) {
      lines.push('> ⚠ error');
      lines.push('');
      lines.push('```');
      lines.push(r.error);
      lines.push('```');
      lines.push('');
    }

    if (!r.sanity.passed && r.sanity.reasons.length > 0) {
      lines.push('**Sanity failed:**');
      for (const reason of r.sanity.reasons) lines.push(`- ${reason}`);
      lines.push('');
    }

    if (r.judgeNotes) {
      lines.push(`**Judge notes** (\`${r.judgeModel || 'llm'}\`):`);
      lines.push('');
      lines.push('> ' + r.judgeNotes.replace(/\n/g, '\n> '));
      lines.push('');
    }

    lines.push('**Output:**');
    lines.push('');
    lines.push('```' + codeFenceLang(c.outputSchema));
    lines.push(r.output || '(empty)');
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

function fmtScore(v: number | undefined): string {
  if (v === undefined || Number.isNaN(v)) return '—';
  return String(v);
}

function codeFenceLang(schema: 'text' | 'json' | 'code'): string {
  if (schema === 'json') return 'json';
  if (schema === 'code') return '';
  return '';
}

function pickJudgeModel(run: Run): string | null {
  for (const r of run.results) {
    if (r.scoreSource === 'llm-judge' && r.judgeModel) return r.judgeModel;
  }
  return null;
}
