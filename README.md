<div align="center">

# EvalLens

跑在你自己电脑上的小型大模型评测台。  
选一个任务、勾几个模型、点一下运行 —— 几秒之后拿到一份可以直接发给同事的对比报告。

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[简体中文](./README.md) · [English](./README.en.md)

</div>

---

## 在线试用

[打开在线 Demo](https://evallens.vercel.app/) 直接体验完整流程；不需要 API key，线上版默认只跑内置 mock provider。

也可以点下面这个按钮，把 EvalLens 一键部署到自己的 Vercel：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyuebanyin%2Fevallens&env=EVALLENS_DEMO&envDescription=Set+to+1+to+force+mock-only+demo+mode+%28recommended+for+public+demos%29&envLink=https%3A%2F%2Fgithub.com%2Fyuebanyin%2Fevallens%23demo-mode)

> Demo 模式下只跑内置的 mock provider、不调真模型，数据写到 `/tmp` 是临时的——既能让访客把整套流程跑一遍，也不会烧你的 API key。本地开发不受影响。

---

## 这是个什么东西

"GPT-5 还是 Claude，到底哪个更适合我们的产品？"

这个问题我自己被问过、也问过别人很多次。诚实的答案永远是"看你的任务"，但真要去回答它，你会发现现成的工具不是太工程师向（OpenAI Evals、Promptfoo），就是太贵（LangSmith），要么就只能在各家厂商自己的 playground 里横向不了。

所以我想要一个**够轻**的东西：

- 跑在本地，不用部署、不用付费、不用注册
- 没有 API key 也能完整体验一遍流程
- 同一个任务发给多个模型，并排看输出 + 一张雷达图
- 评测之前先校验，避免拿一份本身就有问题的输出去打分

这就是 EvalLens。

---

## 快速开始

```bash
git clone https://github.com/yuebanyin/evallens.git
cd evallens
npm install

# 没有 API key 也能跑，会自动走 mock 模式
cp .env.example .env.local
# 想接真模型的话，在 .env.local 里填 OPENAI_API_KEY / ANTHROPIC_API_KEY

npm run dev
# http://localhost:3000
```

启动后会看到几个预置的 case：勾上你想跑的模型，点 Run，过几秒会跳到对比页。

---

## 它现在能干什么

- **多 Provider 并发**：OpenAI、Anthropic，以及一个内置的 mock provider，方便没 key 的人也能完整体验
- **Sanity Check**：评分前先校验 case 写得对不对、模型输出合不合规（关键字、格式、长度），把噪声挡在前面
- **五维 Rubric 模板**：按任务类型预置了 UI / Bug / Feature / 文档 / 安全 五套打分维度
- **并排对比 + 雷达图**：一屏看完多个模型的输出、延迟、token 数，以及五个维度的得分
- **本地 JSON 存储**：每次运行落到 `.evallens/runs/<id>.json`，可以直接 grep、diff、丢进 git，需要的时候也方便迁移走

---

## 项目结构

```
src/
├── app/
│   ├── page.tsx                  # 首页：case 列表 + 最近运行
│   ├── runs/[id]/page.tsx        # 详情页：雷达图 + 并排对比
│   └── api/run/route.ts          # 多模型并行调用入口
├── lib/
│   ├── providers/                # openai / anthropic / mock 适配器
│   ├── sanity-check.ts           # 评分前的两道门
│   ├── rubric.ts                 # 五维评分模板 + heuristic 打分
│   ├── store.ts                  # 本地 JSON 持久化
│   └── types.ts                  # Zod schema
├── components/                   # RunPanel、RadarChart 等
└── data/seed-cases.json          # 预置的几个评测样例
```

几个有意为之的选择：

- **Next.js 全栈，不另起 Python**。目标是非 ML 同学也能 `npm run dev` 一句话起来，不想为一个本地小工具引入 Docker / FastAPI。
- **直接用 Vercel AI SDK**。多 Provider 抽象已经做得很成熟了，自己再写一层适配是浪费时间。
- **本地 JSON 而不是数据库**。一个评测工具最重要的是"数据自己掌握"，可以 grep、可以 diff、可以丢 git，比 Postgres 重要。
- **Sanity Check 是默认行为而不是可选项**。这是我做评测踩过最多次的坑：case 自己就有问题，模型输出明显不对劲，但流水线还是闷头打分，最后报告全是噪声。

---

## Sanity Check：评分前的两道门

```
case 草稿  ──Build 门──▶  可执行 case  ──Sanity 门──▶  有效输出  ──▶  打分 & 对比
            (能跑起来)                 (输出合理、不空、不违反约束)
```

只有同时通过 Build 和 Sanity 的输出才会进打分环节。这条规则单独拎出来听着像废话，但它能消掉自研评测最常见的失败模式：拿一份本身就有问题的回答去打分，最后得到一份看上去煞有介事、实际全是噪声的报告。

---

## Roadmap

已经做完的：

- [x] 多 Provider 并发跑（OpenAI / Anthropic / Mock）
- [x] 五维 Rubric 打分
- [x] Sanity Check 双门
- [x] 并排对比 + 雷达图
- [x] 本地 JSON 存储
- [x] 模型选择 UI（每个 case 可以单独勾要跑哪些模型）
- [x] 自定义 case 表单（在 UI 里直接添加 / 编辑 / 删除自己的任务）
- [x] LLM-as-judge：用一个模型按 rubric 给另一个打分，并保留 judge notes
- [x] 一键导出 Markdown / 自包含 HTML 报告（HTML 自带内联 SVG 雷达图，可离线打开）
- [x] Demo 模式 + Vercel 部署支持（一键试用，不烧 key）

接下来想做：

- [ ] 跨 run 的对比（同一个 case 在不同时间、不同模型上的演化）
- [ ] 接入公开数据集（SWE-bench Lite、HumanEval 等）
- [ ] CI（GitHub Actions：typecheck + lint + 基本冒烟）

---

## Demo mode

设置 `EVALLENS_DEMO=1`（或直接部署到 Vercel——自动识别 `VERCEL` 环境变量后默认打开）后，会启用以下保护：

- `availableProviders()` 只返回内置 mock，OpenAI / Anthropic 条目被剥掉
- 即使有人伪造请求体硬指定 `provider=openai`，运行入口也会把它兜底转成同名 mock
- LLM-as-Judge 自动退化到 heuristic 打分，绝不调用真模型
- 数据写入路径切到 `/tmp/.evallens-demo/`（Vercel 等 serverless 上可写但临时）
- 首页会显示 `Demo mode (mock only · ephemeral)` 的橙色 badge

如果想在 Vercel 上跑真模型（自费、给可信用户用），把 `EVALLENS_DEMO=0` 显式传进环境变量即可。但要注意 serverless FS 是临时的，数据不会跨函数实例保留——长期生产请改成外部存储。

---

## 关于这个项目

EvalLens 是我业余时间在做的开源项目，主要想解决一个我自己经常遇到的问题：

> 每次有新模型出来，团队里第一反应都是"那我们要不要切？"，但真去验证"切了到底有没有变好"这件事，往往拖到产品已经上线很久才发现某些场景反而变差了。

我想要一个轻量到能在 10 分钟内 setup、又靠谱到能拿结果说话的东西。如果它对你也有帮助，欢迎在 [GitHub](https://github.com/yuebanyin/evallens) 上点个 star 或者提 issue 一起讨论。

---

## License

MIT © 2026 [@yuebanyin](https://github.com/yuebanyin)
