<div align="center">

# 🔍 EvalLens

**一个 Local-first 的大模型评测工作台 —— 让任何人都能在自己的真实任务上对比、审计 LLM 行为,无需机器学习背景。**

[English](./README.md) · [简体中文](./README.zh-CN.md)

</div>

---

## 为什么做 EvalLens?

> *"GPT-5 还是 Claude?到底哪个更适合我们的产品?"*

几乎每一个 PM、研究员、工程师都问过这个问题。诚实的答案永远是 **"取决于你的任务"** —— 但能帮你找到答案的工具,要么太工程师向(OpenAI Evals / Promptfoo),要么太贵(LangSmith),要么各家厂商各自为政。

**EvalLens** 把工业级模型评测的严谨方法论 —— 我在微软 CoreAI Post-Training 团队做了一年的那套 —— 浓缩成一个跑在你本地电脑上的工具。

---

## ✨ 特性

- **🪶 Local-first** —— 你的 prompt 和数据从不离开本机
- **🔌 多 Provider 开箱即用** —— OpenAI / Anthropic / 内置 mock(没 key 也能 demo)
- **🧪 默认 Sanity Check** —— 评分之前先验证 case 本身是否可信
- **📐 五维 Rubric 模板** —— UI / Bug / Feature / 文档 / 安全
- **📊 并排对比 + 雷达图** —— 一屏看完差异、耗时、成本
- **🧠 Self-eval 模式** —— 用一个模型给另一个打分 + 人工 override
- **📤 一键导出 HTML 报告** —— 分享给非技术 stakeholder

---

## 🚀 快速开始

```bash
git clone https://github.com/<你>/evallens.git
cd evallens
npm install
cp .env.example .env.local   # 可选,没 key 也能跑(mock 模式)
npm run dev
# 打开 http://localhost:3000
```

---

## 🧭 核心方法论:双门禁

EvalLens 把工业级 benchmark 的关键设计沉淀成了产品的一等公民功能:

```
   Case 草稿  ──Build 门禁──▶  可执行 Case  ──Sanity 门禁──▶  有效结果  ──▶  评分对比
```

**只有同时通过 Build 和 Sanity 两道门禁的 case 才会计入评分**。这一条设计,直接消除了自研评测最常见的坑:**用本身就有问题的 case 给模型打分**。

---

## 🎯 关键技术决策

| 决策 | 为什么 |
|---|---|
| Next.js 全栈,不另起 Python 服务 | 让非 ML 用户也能一键起跑 |
| 用 Vercel AI SDK 而非自研适配器 | 2026 年这已是事实标准,自研是浪费 |
| 本地 JSON 存储而非 Postgres | Local-first 承诺,信任 > 规模 |
| Sanity Check 设为一等公民 | 业界普遍假设 case 是对的 —— 但其实不是 |

---

## 🗺️ Roadmap

详见 [README.md](./README.md#-roadmap)

---

## 🙋 关于作者

我在微软 CoreAI Post-Training 团队做了一年模型评测和 Benchmark 扩展(Terminal-Bench2、IT_Bench)。团队的内部工具非常强大,但只有 ML 工程师能用。

EvalLens 是我把那套严谨方法论带给所有人的尝试 —— 给所有需要为"该选哪个模型"做决策的 PM、研究员和产品工程师。

---

## 📄 License

MIT © 2026
