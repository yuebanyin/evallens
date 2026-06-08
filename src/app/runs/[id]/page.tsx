import Link from 'next/link';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { getRun } from '@/lib/store';
import { RUBRIC_DIMENSIONS } from '@/lib/rubric';
import { formatUtcDateTime } from '@/lib/format';

const RadarChart = dynamic(() => import('@/components/RadarChart').then((m) => m.RadarChart), {
  ssr: false,
});

export default async function RunPage({ params }: { params: { id: string } }) {
  const run = await getRun(params.id);
  if (!run) notFound();

  const c = run.caseSnapshot;
  const dims = RUBRIC_DIMENSIONS[c.dimension];

  // Build radar dataset: one series per model result
  const radarData = dims.map((d) => {
    const point: Record<string, string | number> = { dimension: d.label };
    run.results.forEach((r) => {
      const key = `${r.provider}/${r.model}`;
      point[key] = r.scores?.[d.key] ?? 0;
    });
    return point;
  });

  const seriesKeys = run.results.map((r) => `${r.provider}/${r.model}`);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/" className="text-xs text-muted hover:text-fg">
          ← back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{c.title}</h1>
        <p className="mt-1 text-xs text-muted">
          {c.dimension} · {run.results.length} models · started{' '}
          {formatUtcDateTime(run.startedAt)}
        </p>
      </div>

      {/* Prompt card */}
      <section className="rounded-xl border border-border bg-panel p-5">
        <h2 className="mb-2 text-xs uppercase tracking-wider text-muted">Prompt</h2>
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-fg/90">
          {c.prompt}
        </pre>
      </section>

      {/* Radar */}
      <section className="rounded-xl border border-border bg-panel p-5">
        <h2 className="mb-4 text-xs uppercase tracking-wider text-muted">5-Dimension radar</h2>
        <div className="h-[360px]">
          <RadarChart data={radarData} keys={seriesKeys} />
        </div>
      </section>

      {/* Side-by-side */}
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
                    <ScoreSourceBadge source={r.scoreSource} judgeModel={r.judgeModel} />
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

                {r.judgeNotes && (
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
  const s = source ?? 'heuristic';
  if (s === 'llm-judge') {
    return (
      <span
        title={judgeModel ? `Scored by ${judgeModel}` : 'Scored by an LLM judge'}
        className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent"
      >
        judge{judgeModel ? `: ${judgeModel}` : ''}
      </span>
    );
  }
  if (s === 'human') {
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
