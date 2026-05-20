<div align="center">

# 🔍 EvalLens

**一个 Local-first 的大模型评测工作台 —— 让任何人都能在自己的真实任务上跑通、对比、审视 LLM 的表现，不需要任何机器学习背景。**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-3.x-7c5cff)](https://sdk.vercel.ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[简体中文](./README.md) · [English](./README.en.md)

</div>

---

## 为什么会有 EvalLens？

> *"GPT-5 还是 Claude？到底哪个更适合我们这个产品？"*

几乎每个 PM、研究员、工程师都问过这个问题。诚实的答案永远是 **"看你的任务是什么"** —— 但能帮你找到答案的工具，要么太工程师向（OpenAI Evals / Promptfoo），要么太贵（LangSmith），要么各家厂商各管一摊。

**EvalLens** 想把"工业级模型评测"那套严谨方法，浓缩成一个跑在你本地电脑上的小工具：选一个任务、点一下运行、几秒钟拿到一份能直接发给同事看的对比报告。

```
            ┌──────────────────────────────────────────────────┐
            │                🧪 你的真实任务                    │
            └──────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
    ┌────────┐               ┌────────┐               ┌────────┐
    │ GPT-5  │               │ Claude │               │  Mock  │
    └───┬────┘               └───┬────┘               └───┬────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 ▼
                      ┌──────────────────────┐
                      │   EvalLens 引擎       │
                      │  • Sanity Check 门禁  │
                      │  • 五维 Rubric 评分   │
                      │  • 雷达图 & 并排对比  │
                      └──────────┬───────────┘
                                 ▼
                  📊  一屏看完的对比报告
```

---

## ✨ 它能做什么

- **🪶 Local-first** —— 全部跑在本机，prompt 和数据不出你的电脑
- **🔌 多 Provider 开箱即用** —— OpenAI、Anthropic，外加一个内置 **Mock Provider**，让你 **没有任何 API key 也能完整体验**
- **🧪 默认带 Sanity Check 门禁** —— 评分前先校验模型输出是否符合最基本的预期（关键字、格式、长度），从根上避免"用一份本身就有问题的回答去打分"
- **📐 五维 Rubric 评分模板** —— `UI · Bug · Feature · Documentation · Security` 五种任务类型，每种都有预设的打分维度
- **📊 一屏并排对比 + 雷达图** —— 同时显示多个模型的输出、延迟、Token 数，以及五个维度的得分雷达图
- **📁 全部以 JSON 存在本地** —— 每次运行都会落到 `.evallens/runs/<id>.json`，可以直接 grep、diff、分享

---

## 🚀 快速开始

```bash
# 1. 克隆 & 安装
git clone https://github.com/yuebanyin/evallens.git
cd evallens
npm install

# 2. （可选）配置 API Key —— 不配置也能用，会走 Mock 模式
cp .env.example .env.local
# 然后填入你的 OPENAI_API_KEY 或 ANTHROPIC_API_KEY

# 3. 启动
npm run dev
# 打开 http://localhost:3000
```

启动后你会看到 5 个预置的 Case：选一个，点 **Run ▸**，几秒后就会跳到对比页面。

> 💡 **没有 API Key 怎么办？** 不影响。EvalLens 会自动检测并启用 Mock Provider，模拟出真实模型的输出和延迟，让你先把整个流程跑通再说。

---

## 🧱 项目结构

```
src/
├── app/
│   ├── page.tsx                  # 首页：Case 列表 + 最近运行
│   ├── runs/[id]/page.tsx        # 对比详情页（雷达图 + 并排）
│   └── api/run/route.ts          # 并行调用多个模型的 API
├── lib/
│   ├── providers/                # OpenAI / Anthropic / Mock 适配器
│   ├── sanity-check.ts           # ⭐ Sanity 校验逻辑
│   ├── rubric.ts                 # ⭐ 五维评分模板
│   ├── store.ts                  # 本地 JSON 持久化
│   └── types.ts                  # Zod 类型定义
├── components/                   # RadarChart、RunButton 等
└── data/seed-cases.json          # 5 个预置评测样例
```

### 为什么这么设计

| 决策 | 理由 |
|---|---|
| **Next.js 全栈，不另起 Python 后端** | 给非 ML 用户最低的上手门槛：一句 `npm run dev`，不需要 Docker、不需要 FastAPI |
| **直接用 Vercel AI SDK** | 2026 年的事实标准，多 Provider 抽象已经做得很好，自己再写一层是浪费 |
| **本地 JSON 而不是数据库** | Local-first 的承诺：信任 > 规模。评测工具更需要"我的数据我自己掌握" |
| **Sanity Check 作为一等公民** | 大多数评测工具默认 case 是对的 —— 但实际上 case 自己就经常翻车，必须先校验 case 再打分 |

---

## 📐 核心方法论：双门禁

EvalLens 把"工业级 benchmark"最关键的那一条设计沉淀成了产品功能：

```
   ┌──────────┐    Build 门禁     ┌──────────┐   Sanity 门禁    ┌──────────┐
   │ Case 草稿 │ ────────────────▶│ 可执行的  │ ───────────────▶│  有效的   │
   │           │  (Schema 合法、    │   Case   │ (输出本身合理、    │  评测结果 │
   │           │   能跑起来)        │           │   不是空 / 报错)   │           │
   └──────────┘                   └──────────┘                  └──────────┘
                                                                      │
                                                                      ▼
                                                              📊 打分 & 对比
```

**只有同时通过 Build 和 Sanity 两道门禁的结果，才会进入最终打分。** 这一条设计能直接消除自研评测最常见的坑：**拿本身就有问题的输出给模型打分，得到一份看着像样、实际全是噪声的报告。**

---

## 🗺️ Roadmap

已经做完的：

- [x] 多 Provider 并行运行（OpenAI · Anthropic · Mock）
- [x] 五维 Rubric 打分模板
- [x] Sanity Check 门禁
- [x] 并排对比 + 雷达图
- [x] 本地 JSON 持久化

计划中：

- [ ] 一键导出 HTML 报告，方便分享给非技术同事
- [ ] LLM-as-judge 自评模式（模型互评 + 人工 override）
- [ ] RAG 评测模块（检索召回 + 回答质量）
- [ ] 接入公开数据集（SWE-bench Lite、HumanEval 等）
- [ ] 插件 SDK，让用户能自定义 Provider 和评分维度

---

## 🙋 关于作者

EvalLens 是我的个人开源项目，想把"严谨的模型评测"这件事做得**让所有人都能用** —— 不只是 ML 工程师，PM、研究员、产品工程师都应该能基于自己的真实任务，做出靠谱的"该选哪个模型"的决定。

如果这个项目对你有帮助，欢迎在 [GitHub](https://github.com/yuebanyin/evallens) 上点个 ⭐ 或者提 Issue 一起讨论。

---

## 📄 License

MIT © 2026 [@yuebanyin](https://github.com/yuebanyin)
