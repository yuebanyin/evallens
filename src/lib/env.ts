import path from 'node:path';

/**
 * 运行环境探测 —— 主要服务 Step 5：把项目跑在 Vercel 等无状态环境上。
 *
 * Demo 模式的定义：
 *   - 强制只用 mock provider（不调真模型，不消耗 token）
 *   - 关掉 LLM judge（同上）
 *   - 写入路径用临时盘（/tmp），数据是临时的，不期望持久
 *
 * 触发方式（按优先级）：
 *   1) EVALLENS_DEMO=1  → 显式开启
 *   2) EVALLENS_DEMO=0  → 显式关闭（即使在 Vercel 上也按本地常驻模式跑，需要你自己保证 FS 可写）
 *   3) 没显式设置时：在 Vercel 上默认开启 demo
 */
export function isDemoMode(): boolean {
  const flag = process.env.EVALLENS_DEMO;
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

/**
 * 当前进程的 root 是否只读 —— 简单按"是 serverless"近似。Vercel / Netlify functions
 * 的 cwd 是不可写的，必须落到 /tmp 才能 write。
 */
function isReadOnlyCwd(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * Runs / Cases 落盘的 root。
 *  - 本地：项目根 `.evallens/`
 *  - serverless / demo：`/tmp/.evallens-demo/`（写得进去，但每次冷启可能消失，可接受）
 */
export function storageRoot(): string {
  if (isDemoMode() || isReadOnlyCwd()) {
    return path.join('/tmp', '.evallens-demo');
  }
  return path.join(process.cwd(), '.evallens');
}
