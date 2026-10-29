'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { RunSchema, type Run } from '@/lib/types';
import { RUBRIC_DIMENSIONS } from '@/lib/rubric';
import { formatUtcDateTime } from '@/lib/format';
import { toHtml } from '@/lib/export/html';
import { toMarkdown } from '@/lib/export/markdown';

const RadarChart = dynamic(() => import('@/components/RadarChart').then((m) => m.RadarChart), {
  ssr: false,
});

interface Props {
  runId: string;
  initialRun: Run | null;
}

export function RunViewer({ runId, initialRun }: Props) {
  const [run, setRun] = useState(initialRun);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRun) return;

    const stored = sessionStorage.getItem(`evallens:run:${runId}`);
    if (!stored) {
      setLoadError(
        'This run is not available in server storage or this browser session. Return to the demo and run it again.',
      );
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stored);
    } catch {
      setLoadError('The saved run data in this browser session is invalid. Run the case again.');
      return;
    }

    const parsedRun = RunSchema.safeParse(parsedJson);
    if (!parsedRun.success || parsedRun.data.id !== runId) {
      setLoadError('The saved run data does not match this result URL. Run the case again.');
      return;
    }

    setRun(parsedRun.data);
  }, [initialRun, runId]);

  if (!run) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-border bg-panel p-6">
        <h1 className="text-lg font-semibold">
          {loadError ? 'Run unavailable' : 'Loading run…'}
        </h1>
        {loadError && <p className="mt-2 text-sm text-muted">{loadError}</p>}
        <Link href="/" className="mt-4 inline-block text-sm text-accent hover:underline">
          ← Back to cases
        </Link>
      </section>
    );
  }

  const c = run.caseSnapshot;
  const dims = RUBRIC_DIMENSIONS[c.dimension];
  const scoredResults = run.results.filter(
    (r) => r.sanity.passed && Object.keys(r.scores ?? {}).length > 0,
  );

  const radarData = dims.map((d) => {
    const point: Record<string, string | number> = { dimension: d.label };
    scoredResults.forEach((r) => {
      const key = `${r.provider}/${r.model}`;
      point[key] = r.scores?.[d.key] ?? 0;
    });
    return point;
  });
  const seriesKeys = scoredResults.map((r) => `${r.provider}/${r.model}`);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/" className="text-xs text-muted hover:text-fg">
          ← back
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{c.title}</h1>
            <p className="mt-1 text-xs text-muted">
              {c.dimension} · {run.results.length} models · started{' '}
              {formatUtcDateTime(run.startedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadReport(run, 'md')}
              className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-muted hover:text-fg"
              title="Download a plain Markdown report"
            >
              Export .md
            </button>
            <button
              type="button"
              onClick={() => downloadReport(run, 'html')}
              className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
              title="Download a self-contained HTML report (printable, no network)"
            >
              Export .html
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-panel p-5">
        <h2 className="mb-2 text-xs uppercase tracking-wider text-muted">Prompt</h2>
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-fg/90">
          {c.prompt}
        </pre>
      </section>

      <section className="rounded-xl border border-border bg-panel p-5">
        <h2 className="mb-4 text-xs uppercase tracking-wider text-muted">
          5-Dimension radar · Sanity-passed results
        </h2>
        {scoredResults.length > 0 ? (
          <div className="h-[360px]">
            <RadarChart data={radarData} keys={seriesKeys} />
          </div>
        ) : (
          <p className="text-sm text-muted">
            No results passed Sanity checks, so there are no scores to chart.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-wider text-muted">
          Side-by-side outputs
        </h2>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(run.results.length, 3)}, minmax(0, 1fr))`,
          }}
        >
          {run.results.map((r, i) => {
            const failed = !r.sanity.passed || !!r.error;
            return (
              <article
                key={i}
                className={`rounded-xl border bg-panel p-5 ${
                  failed ? 'border-warn/40' : 'border-border'
                }`}
              >
                <header className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">
                    <span className="text-muted">{r.provider}</span>
                    <span className="mx-1.5 text-muted">/</span>
                    {r.model}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {r.sanity.passed ? (
                      <ScoreSourceBadge source={r.scoreSource} judgeModel={r.judgeModel} />
                    ) : (
                      <span className="rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-warn">
                        not scored
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                        r.sanity.passed
                          ? 'border-ok/30 bg-ok/10 text-ok'
                          : 'border-warn/30 bg-warn/10 text-warn'
                      }`}
                    >
                      {r.sanity.passed ? 'sanity ✓' : 'sanity ✗'}
                    </span>
                  </div>
                </header>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted">
                  <Stat label="latency" value={`${r.latencyMs}ms`} />
                  <Stat label="in" value={fmtNum(r.inputTokens)} />
                  <Stat label="out" value={fmtNum(r.outputTokens)} />
                </dl>

                {r.error && (
                  <div className="mt-3 rounded border border-err/30 bg-err/10 p-2 text-xs text-err">
                    {r.error}
                  </div>
                )}

                {!r.sanity.passed && r.sanity.reasons.length > 0 && (
                  <ul className="mt-3 list-disc rounded border border-warn/30 bg-warn/5 p-2 pl-6 text-xs text-warn">
                    {r.sanity.reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                )}

                {r.sanity.passed && r.judgeNotes && (
                  <details className="mt-3 rounded border border-accent/30 bg-accent/5 p-2 text-xs">
                    <summary className="cursor-pointer text-accent">
                      Judge notes ({r.judgeModel || 'llm'})
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap text-fg/90">{r.judgeNotes}</p>
                  </details>
                )}

                <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap rounded bg-bg p-3 font-mono text-xs leading-relaxed text-fg/90 scroll-thin">
                  {r.output || '(empty)'}
                </pre>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-bg px-2 py-1">
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-mono text-fg">{value}</div>
    </div>
  );
}

function ScoreSourceBadge({
  source,
  judgeModel,
}: {
  source?: 'heuristic' | 'llm-judge' | 'human';
  judgeModel?: string;
}) {
  const scoreSource = source ?? 'heuristic';
  if (scoreSource === 'llm-judge') {
    return (
      <span
        title={judgeModel ? `Scored by ${judgeModel}` : 'Scored by an LLM judge'}
        className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent"
      >
        judge{judgeModel ? `: ${judgeModel}` : ''}
      </span>
    );
  }
  if (scoreSource === 'human') {
    return (
      <span className="rounded-full border border-ok/30 bg-ok/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ok">
        human
      </span>
    );
  }
  return (
    <span
      title="Heuristic placeholder score (length + keyword overlap + constraints)"
      className="rounded-full border border-border bg-bg px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted"
    >
      heuristic
    </span>
  );
}

function fmtNum(n: number | undefined) {
  if (n === undefined) return '—';
  return Math.round(n).toLocaleString();
}

function downloadReport(run: Run, format: 'md' | 'html') {
  const blob = new Blob([format === 'md' ? toMarkdown(run) : toHtml(run)], {
    type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `evallens-${run.id}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}
