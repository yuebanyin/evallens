<div align="center">

# 🔍 EvalLens

**A local-first benchmark playground that lets anyone run, compare, and audit LLM behavior on their own tasks — without an ML background.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-3.x-7c5cff)](https://sdk.vercel.ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](./README.md) · [简体中文](./README.zh-CN.md)

</div>

---

## Why EvalLens?

> *"GPT-5 or Claude? Which one is actually better for **our** product?"*

Every PM, researcher, and engineer has asked this. The honest answer today is **"it depends on your task"** — but the tools to find that out are either too engineer-heavy (OpenAI Evals, Promptfoo), too expensive (LangSmith), or too vendor-locked (each lab's own playground).

**EvalLens** brings the rigor of an internal model-evaluation pipeline — the kind I helped build at Microsoft's CoreAI Post-Training team — to anyone, running entirely on your laptop.

```
            ┌──────────────────────────────────────────────────┐
            │            🧪  Your Real-World Task               │
            └──────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
    ┌────────┐               ┌────────┐               ┌────────┐
    │ GPT-5  │               │ Claude │               │ Gemini │
    └───┬────┘               └───┬────┘               └───┬────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 ▼
                      ┌──────────────────────┐
                      │   EvalLens Engine    │
                      │  • Sanity Check      │
                      │  • 5-Dim Rubric      │
                      │  • Diff & Radar      │
                      └──────────┬───────────┘
                                 ▼
                  📊  Shareable Comparison Report
```

---

## ✨ Highlights

- **🪶 Local-first.** No SaaS lock-in. Your prompts and data never leave your machine.
- **🔌 Multi-provider out of the box.** OpenAI, Anthropic, and a built-in **mock provider** so you can demo *without any API key*.
- **🧪 Sanity Check by default.** Every case is validated for *test-itself correctness* before scoring — borrowed from how AI labs guard their benchmarks against bad cases.
- **📐 5-Dimension Rubric templates.** UI · Bug · Feature · Documentation · Security — preset and customizable.
- **📊 Side-by-side compare + radar.** Token diff, latency, cost, and a 5-axis radar chart in one screen.
- **🧠 Self-eval mode.** Let one model judge another, with human-in-the-loop override.
- **📤 One-click HTML report.** Shareable artifacts for non-technical stakeholders.

---

## 🚀 Quick Start

```bash
# 1. Install
git clone https://github.com/<you>/evallens.git
cd evallens
npm install

# 2. (Optional) add your keys — EvalLens runs in mock mode without them
cp .env.example .env.local

# 3. Run
npm run dev
# → http://localhost:3000
```

You'll see 5 seed cases pre-loaded. Pick one, choose models, hit **Run** — done.

---

## 🧱 Architecture

```
src/
├── app/
│   ├── page.tsx                  # Case list + Run trigger
│   ├── runs/[id]/page.tsx        # Compare view
│   └── api/run/route.ts          # Parallel multi-model invocation
├── lib/
│   ├── providers/                # OpenAI / Anthropic / Mock adapters
│   ├── sanity-check.ts           # ⭐ Two-gate validation (Build + Sanity)
│   ├── rubric.ts                 # ⭐ 5-dim scoring templates
│   ├── store.ts                  # Local JSON persistence
│   └── types.ts                  # Zod-typed Case / Run / Result
├── components/                   # CompareView, RadarChart, ModelPicker
└── data/seed-cases.json          # 5 built-in evaluation templates
```

### Why these choices?

| Decision | Rationale |
|---|---|
| **Next.js fullstack** (no separate Python backend) | Lower deploy friction for non-ML users. One `npm run dev`, no Docker, no FastAPI. |
| **Vercel AI SDK** | 2026's de-facto multi-provider abstraction. Self-rolling adapters is wasted effort. |
| **Local JSON store, not Postgres** | Local-first promise. Trust matters more than scale for an eval tool. |
| **Sanity Check as a first-class feature** | Most eval tools assume cases are correct. They aren't. This is the "test the test" gate. |

---

## 📐 The Two-Gate Methodology

EvalLens enforces a methodology I learned shipping benchmarks at scale:

```
   ┌──────────┐    Build Gate     ┌──────────┐   Sanity Gate    ┌──────────┐
   │   Case   │ ────────────────▶ │ Executable│ ───────────────▶ │  Valid   │
   │  Drafted │ (schema, runnable)│   Case    │ (case-itself OK) │  Result  │
   └──────────┘                   └──────────┘                  └──────────┘
                                                                      │
                                                                      ▼
                                                              📊 Score & Compare
```

A case only contributes to scoring after passing **both** gates. This single design choice eliminates the most common failure mode of homegrown evals: scoring against broken tests.

---

## 🗺️ Roadmap

- [x] Multi-provider runner (OpenAI · Anthropic · Mock)
- [x] 5-dimension rubric templates
- [x] Sanity-check gate
- [x] Side-by-side compare + radar chart
- [ ] Shareable HTML report export
- [ ] RAG evaluation module (retrieval + answer quality)
- [ ] Self-eval mode (LLM-as-judge with human override)
- [ ] Dataset importers (SWE-bench Lite, HumanEval)
- [ ] Plugin SDK

---

## 🙋 About this project

I spent a year at **Microsoft CoreAI Post-Training** building model evaluation pipelines and benchmark extensions (Terminal-Bench2, IT_Bench). The internal tools were powerful but inaccessible — only ML engineers could use them.

EvalLens is my attempt to make that same rigor available to **everyone** who needs to make informed decisions about which LLM to ship — PMs, researchers, and product engineers alike.

---

## 📄 License

MIT © 2026
