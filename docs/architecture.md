# EvalLens — Architecture & Design Decisions

> A condensed designer's notebook. Use this as a reference when explaining the
> project in an interview or technical writeup.

## 1. Problem framing

LLM evaluation is dominated by two camps:

- **Lab-grade** (OpenAI Evals, internal CoreAI pipelines): rigorous, but only
  ML engineers can operate them.
- **SaaS observability** (LangSmith, Helicone): powerful, but requires shipping
  your prompts and data outside.

The middle is empty: a tool that lets a single developer or PM
**audit which model works for their task** with rigor, on their laptop.

EvalLens fills that gap.

## 2. Non-goals (deliberately)

- **Not** a training / fine-tuning platform.
- **Not** a production telemetry tool — that's LangSmith's space.
- **Not** a leaderboard — leaderboards generalize poorly to your task.

## 3. The two-gate methodology

Borrowed from production benchmark pipelines:

```
Case Draft ──Build Gate──▶ Executable Case ──Sanity Gate──▶ Scored Result
```

| Gate | Purpose | Implementation |
|---|---|---|
| **Build** | Is the *case itself* well-formed? | `checkCase()` validates schema, prompt size, required fields. |
| **Sanity** | Is the *output* structurally usable before scoring? | `checkOutput()` validates JSON-parsability, constraint tokens, length. |

A case that fails Build is rejected before any model is called.
A result that fails Sanity is shown but excluded from aggregate scoring.

This single design prevents the most common failure mode of homegrown evals:
**giving credit (or blame) for output that was never structurally valid**.

## 4. Adapter pattern for providers

All providers conform to:

```ts
(case: Case, model: string) => Promise<ModelResult>
```

Implementations live in `src/lib/providers/{openai,anthropic,mock}.ts` and are
fanned out in parallel from `runProviders()`. Adding a new provider is one new
file + one entry in the dispatch switch.

The **mock** provider exists for two reasons:
1. Demo without API keys.
2. Deterministic local tests.

## 5. Storage

Runs are written as plain JSON under `.evallens/runs/<id>.json`. Rationale:

- **Local-first** — nothing leaves the machine.
- **Trivial to inspect / version** — `cat`, `git diff`, share via gist.
- **Zero migration cost** — JSON is forward-compatible.

If/when a team mode is added, the same JSON shape will move into Postgres
without changing the type system.

## 6. Scoring strategy

The MVP uses a **heuristic auto-scorer** (`heuristicScore()`) so users see a
radar chart immediately. It blends:

- Length signal (proxy for completeness)
- Expected-output token overlap (proxy for correctness)
- Constraint compliance (mustContain / mustNotContain)

This is *not* a replacement for LLM-as-judge — it is a fast first pass that
makes the product feel useful before any keys are added. The roadmap includes
a proper judge pipeline with human-in-the-loop override.

## 7. Why Next.js fullstack (and not Python + React)

The user persona is "I want to try this in 60 seconds." Pythonic toolchains
penalize that persona. One `npm install`, one `npm run dev`, one URL.

Trade-off accepted: we lose access to the deeper Python eval ecosystem
(datasets, HF tooling). Mitigation: provide CSV / JSON dataset importers on
the roadmap so users can bring data prepared elsewhere.

## 8. Lineage

The methodology behind EvalLens — multi-dimension rubrics, build + sanity
gates, seed → sub-case extension — was developed and refined during my work
on Microsoft CoreAI Post-Training (Terminal-Bench2 and IT_Bench pipelines).
EvalLens is the open, accessible distillation of that experience.
