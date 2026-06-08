import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCase, newRunId, saveRun } from '@/lib/store';
import { availableProviders, runProviders } from '@/lib/providers';
import { checkCase } from '@/lib/sanity-check';
import { defaultJudge, judgeResult } from '@/lib/judge';
import type { Run } from '@/lib/types';

const Body = z.object({
  caseId: z.string(),
  /** Optional explicit provider list; defaults to all available. */
  providers: z
    .array(z.object({ id: z.enum(['openai', 'anthropic', 'mock']), model: z.string() }))
    .optional(),
  /** Whether to run LLM-as-Judge on top of heuristic scoring. */
  judge: z.boolean().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const c = getCase(parsed.data.caseId);
  if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  // Build gate
  const build = checkCase(c);
  if (!build.passed) {
    return NextResponse.json(
      { error: 'Case failed Build gate', reasons: build.reasons },
      { status: 422 },
    );
  }

  const providers = parsed.data.providers ?? availableProviders();
  const started = new Date().toISOString();
  const results = await runProviders({ case: c, providers });

  // Default: provider 写入的是 heuristic 分，这里把来源补上。
  for (const r of results) {
    if (!r.scoreSource) r.scoreSource = 'heuristic';
  }

  // 可选 judge 阶段。请求里没写 judge 默认就跑（只要环境里有 key 配 judge）。
  const wantJudge = parsed.data.judge !== false;
  const judge = wantJudge ? defaultJudge() : null;
  if (judge) {
    await Promise.all(
      results.map(async (r) => {
        const out = await judgeResult(c, r, judge);
        if (out) {
          r.scores = out.scores;
          r.scoreSource = 'llm-judge';
          r.judgeModel = out.model;
          r.judgeNotes = out.notes;
        }
      }),
    );
  }

  const run: Run = {
    id: newRunId(),
    caseId: c.id,
    caseSnapshot: c,
    startedAt: started,
    finishedAt: new Date().toISOString(),
    results,
  };
  await saveRun(run);

  return NextResponse.json({ runId: run.id });
}
