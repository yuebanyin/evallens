import type { Run } from '../types';
import { RUBRIC_DIMENSIONS } from '../rubric';
import { radarSvg, type RadarSeries } from './radar-svg';

/**
 * 单文件 HTML 报告：内联 CSS + 内联 SVG 雷达，不发任何外部请求。
 * 设计动机：用户希望"带走"报告（邮件附件 / 打印 / 内网分享），不该再需要联网。
 */
export function toHtml(run: Run): string {
  const c = run.caseSnapshot;
  const dims = RUBRIC_DIMENSIONS[c.dimension];

  const series: RadarSeries[] = run.results.map((r) => ({
    name: `${r.provider}/${r.model}`,
    scores: r.scores ?? {},
  }));
  const svg = radarSvg({ dims, series, size: 520 });

  const judgeModel = pickJudgeModel(run);
  const scoreSourceLabel = judgeModel ? `llm-judge (${judgeModel})` : 'heuristic';

  const headerRow = ['Model', ...dims.map((d) => d.label), 'Sanity']
    .map((h) => `<th>${esc(h)}</th>`)
    .join('');

  const tableRows = run.results
    .map((r) => {
      const cells = [
        `<td><code>${esc(r.provider)}/${esc(r.model)}</code></td>`,
        ...dims.map((d) => `<td>${fmtScore(r.scores?.[d.key])}</td>`),
        `<td>${r.sanity.passed ? '✓' : '✗'}</td>`,
      ].join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const resultCards = run.results
    .map((r) => {
      const statLine = [
        `latency <code>${r.latencyMs}ms</code>`,
        `in <code>${r.inputTokens ?? '—'}</code>`,
        `out <code>${r.outputTokens ?? '—'}</code>`,
        `source <code>${esc(r.scoreSource ?? 'heuristic')}</code>`,
      ].join(' · ');

      const errBlock = r.error
        ? `<div class="alert err"><strong>error:</strong> <pre>${esc(r.error)}</pre></div>`
        : '';

      const sanityBlock =
        !r.sanity.passed && r.sanity.reasons.length > 0
          ? `<div class="alert warn"><strong>Sanity failed:</strong><ul>${r.sanity.reasons
              .map((x) => `<li>${esc(x)}</li>`)
              .join('')}</ul></div>`
          : '';

      const judgeBlock = r.judgeNotes
        ? `<details class="judge"><summary>Judge notes (${esc(r.judgeModel || 'llm')})</summary><p>${esc(
            r.judgeNotes,
          )}</p></details>`
        : '';

      return `
        <article class="card">
          <header>
            <h3>${esc(r.provider)}/${esc(r.model)}</h3>
            <span class="pill ${r.sanity.passed ? 'ok' : 'warn'}">${
              r.sanity.passed ? 'sanity ✓' : 'sanity ✗'
            }</span>
          </header>
          <p class="stats">${statLine}</p>
          ${errBlock}
          ${sanityBlock}
          ${judgeBlock}
          <pre class="output">${esc(r.output || '(empty)')}</pre>
        </article>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>EvalLens · ${esc(c.title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg: #ffffff;
      --fg: #0f172a;
      --muted: #475569;
      --border: #e2e8f0;
      --panel: #f8fafc;
      --accent: #6d28d9;
      --ok: #047857;
      --warn: #b45309;
      --err: #b91c1c;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      line-height: 1.55;
      padding: 32px 24px 80px;
    }
    .wrap { max-width: 980px; margin: 0 auto; }
    h1 { font-size: 24px; margin: 0 0 6px; }
    h2 { font-size: 16px; margin: 28px 0 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
    h3 { font-size: 14px; margin: 0; }
    .meta { color: var(--muted); font-size: 13px; }
    .meta span + span::before { content: " · "; padding: 0 4px; color: #cbd5e1; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
    }
    .prompt { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; }
    th { color: var(--muted); font-weight: 600; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); margin-top: 12px; }
    .card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
    .card header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    .card .stats { color: var(--muted); font-size: 12px; margin: 0 0 8px; }
    .card .output { white-space: pre-wrap; background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; max-height: 320px; overflow: auto; }
    .pill { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); }
    .pill.ok { color: var(--ok); border-color: rgba(4,120,87,0.3); background: rgba(4,120,87,0.08); }
    .pill.warn { color: var(--warn); border-color: rgba(180,83,9,0.3); background: rgba(180,83,9,0.08); }
    .alert { margin: 8px 0; padding: 8px 10px; border-radius: 8px; font-size: 12px; }
    .alert.err { color: var(--err); background: rgba(185,28,28,0.08); border: 1px solid rgba(185,28,28,0.25); }
    .alert.warn { color: var(--warn); background: rgba(180,83,9,0.08); border: 1px solid rgba(180,83,9,0.25); }
    details.judge { margin: 8px 0; padding: 8px 10px; border: 1px solid rgba(109,40,217,0.25); background: rgba(109,40,217,0.05); border-radius: 8px; font-size: 12px; }
    details.judge summary { cursor: pointer; color: var(--accent); }
    .radar-wrap { display: flex; justify-content: center; }
    .radar-wrap svg { max-width: 100%; height: auto; }
    footer { margin-top: 40px; text-align: center; color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${esc(c.title)}</h1>
    <p class="meta">
      <span>${esc(c.dimension)}</span>
      <span>${run.results.length} models</span>
      <span>started ${esc(run.startedAt)}</span>
      <span>score source: <code>${esc(scoreSourceLabel)}</code></span>
    </p>

    <h2>Prompt</h2>
    <div class="panel"><div class="prompt">${esc(c.prompt)}</div></div>

    <h2>Scores</h2>
    <div class="panel">
      <table>
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>

    <h2>Radar</h2>
    <div class="panel radar-wrap">${svg}</div>

    <h2>Outputs</h2>
    <div class="grid">${resultCards}</div>

    <footer>Generated by EvalLens · run <code>${esc(run.id)}</code></footer>
  </div>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtScore(v: number | undefined): string {
  if (v === undefined || Number.isNaN(v)) return '—';
  return String(v);
}

function pickJudgeModel(run: Run): string | null {
  for (const r of run.results) {
    if (r.scoreSource === 'llm-judge' && r.judgeModel) return r.judgeModel;
  }
  return null;
}
