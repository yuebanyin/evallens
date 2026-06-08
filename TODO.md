# TODO / Progress

记录这个项目目前推进到哪一步、为什么这么排。  
不放在 README 里，是因为 README 是给"外部访客"看的，这份是给"我自己和未来贡献者"看的。

---

## 现在进行到哪

**Step 5：Vercel 部署 + Demo 模式（主线）** — done ✅

代码层已经准备好让 EvalLens 跑在 Vercel 上：检测到 `VERCEL` / `EVALLENS_DEMO=1` 会自动切换到 demo 模式（只跑 mock provider、禁用 LLM judge、把数据写到 `/tmp`，并在 UI 顶部显示橙色 badge）。README 顶部加了 "Try it live" 段落与一键 Deploy 按钮。
真正的线上部署需要在你自己的 Vercel 账户里点一下按钮完成 —— 仓库这边已经具备所有前置条件。

下一步进入 **Step 6：GitHub Actions CI**，或先回头清 Step 2/Step 3 的可选 polish。

---

## 路线图

按"性价比"排的整体计划。每一步做完会把对应 commit 链接补上来。

### ✅ Step 0：基础能力（已经在 MVP 里）

- [x] 多 Provider 并发跑（OpenAI / Anthropic / Mock）
- [x] 五维 Rubric 打分（heuristic 占位）
- [x] Sanity Check 双门（Build + Output）
- [x] 并排对比 + 雷达图
- [x] 本地 JSON 持久化

### ✅ Step 1：模型选择 UI

让用户能为每个 case 单独勾选要跑的模型，而不是默认把所有 provider 全跑。

- [x] 新增 `RunPanel` 组件，pill 形式的模型勾选
- [x] 删除老的 `RunButton`
- [x] 默认勾上有 key 的 provider，没 key 时默认勾 `mock-fast`
- [x] 后端零改动（Zod schema 原本就留了 `providers` 字段）

### ✅ Human-pass：去 AI 味

不是新功能，但对求职/开源观感很关键。

- [x] 清掉 `industrial-grade` / `first-class citizen` / `true Local-first` 等营销词
- [x] 文件头注释从"哲学化宣言"改成"踩过的坑 + 设计动机"
- [x] 函数级 JSDoc 从英文翻译式改成口语化中文
- [x] README 砍掉过度 emoji、大 ASCII 图、工整表格，第一人称口语化
- [x] 修复 hydration mismatch（`toLocaleString` + Recharts SSR）
- [x] 修复 tsconfig 的 `ignoreDeprecations` 错误
- [x] Footer 换成个人署名

### ✅ Step 2：自定义 Case 表单（主线已完成）

让产品真正贴合"评测**你自己**的任务"这个卖点。

- [x] 首页加一个"+ 新建 Case"按钮 → 打开表单 / 弹层
- [x] 表单字段：title / dimension / prompt / expected（可选）/ outputSchema / 约束（可选）
- [x] 用现成的 Zod schema 做校验（前端 + API 各一道）
- [x] 提交时新增到本地存储 → 出现在 case 列表里
- [x] 用户自定义 case 存在 `.evallens/cases/<id>.json`（与 runs 并列）
- [x] `listCases()` 同时读 seed + 用户 case
- [x] 首页分组显示 Built-in / Custom
- [x] 支持 Custom case 的 Edit / Delete
- [ ] 收尾优化（可选）：操作反馈 toast / 二次确认文案 / 列表筛选

### ✅ Step 3：LLM-as-Judge 打分

把雷达图从"装饰"升级到"硬通货"。

- [x] 新增 `judge.ts`：用一个模型给另一个模型的输出打分（按 rubric 维度逐项）
- [x] Judge 提示词模板设计（JSON-only、强制 0..5 整数、带一句 notes）
- [x] 在 `route.ts` 里加了一个 `judge` 阶段，可开关（请求体 `judge: boolean`）
- [x] UI 上标记"分数来源"：heuristic / llm-judge(model) / human
- [x] 首页 badge 显示当前 judge 状态（模型名 或 Heuristic only）
- [x] RunPanel 增加 LLM judge 勾选，没 key 时自动禁用
- [ ] 思考：要不要支持 ensemble judge（多个模型投票）？先保持单 judge

### ✅ Step 4：HTML / Markdown 报告导出

让评测结果能"带走"，发给非技术同事。

- [x] 详情页头部加 Export 按钮（.md / .html）
- [x] Markdown：纯文本（meta / prompt / scores 表 / 逐 model output），方便贴 Slack / PR
- [x] HTML：自包含单文件，内联 CSS + 服务端渲染 SVG 雷达（不请外部资源）
- [x] 新增 API `GET /api/runs/<id>/export?format=md|html`，带 Content-Disposition 触发下载
- [x] 报告里保留 score source 与 judge notes
- [ ] 思考：PDF 暂不做，HTML 打印即可

### ✅ Step 5：Vercel 部署 + Demo 链接

让访客 3 秒钟体验产品。

- [x] 新增 `lib/env.ts`：`isDemoMode()` 识别 `EVALLENS_DEMO` / `VERCEL`，`storageRoot()` 在 serverless 上落到 `/tmp/.evallens-demo`
- [x] `providers/index.ts`：demo 下 `availableProviders()` 只返回 mock；`runProviders()` 把任何 real provider 兜底改写成同名 mock，防止伪造请求绕过
- [x] `store.ts`：root 切换到 `storageRoot()`，`listUserCases` 在目录不存在时安全降级
- [x] `judge.ts`：demo 下 `defaultJudge()` 直接 return null
- [x] 首页加 `Demo mode (mock only · ephemeral)` 橙色 badge
- [x] README / README.en.md：顶部 "Try it live" 段落 + 一键 Deploy 按钮 + `## Demo mode` 段落
- [x] `.env.example`：补充 `EVALLENS_DEMO` 与 `JUDGE_*` 注释
- [ ] 真正点一下 Vercel Deploy（需要你的 Vercel 账户登录，仓库这边已 ready）
- [ ] 部署完把 demo URL 回写到 README 顶部

### Step 6：GitHub Actions CI

社区门面，让别人提 PR 有反馈。

- [ ] `.github/workflows/ci.yml`：跑 `npm run typecheck` + `npm run lint`
- [ ] Push / PR 都触发
- [ ] README 加 CI 徽章

---

## 想法池（暂不排期）

随手记的、还没想清楚的：

- 跨 run 对比（同一个 case 在不同时间 / 模型上的演化趋势）
- 接入公开数据集（SWE-bench Lite、HumanEval）
- 插件 SDK（让用户自己写 Provider 适配器）
- RAG 评测模块（检索召回 + 回答质量分开打分）
- "Human override" 模式：用户能手动改打分，并附理由
- Cost 累计 dashboard（每次 run 估算花了多少钱）
