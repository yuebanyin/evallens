import type { Case, ModelResult, ProviderId } from '../types';
import { runOpenAI } from './openai';
import { runAnthropic } from './anthropic';
import { runMock } from './mock';
import { isDemoMode } from '../env';

export interface ProviderSpec {
  id: ProviderId;
  model: string;
}

export interface RunInput {
  case: Case;
  providers: ProviderSpec[];
}

/** 一个 case 打到 N 个 provider，全部并发跳。 */
export async function runProviders(input: RunInput): Promise<ModelResult[]> {
  // Demo 模式做最后一道防线：把所有 real provider 转成同名 mock，避免
  // 客户端伪造请求体绕过 availableProviders 调真模型烧 key。
  const safe = isDemoMode()
    ? input.providers.map((p) => (p.id === 'mock' ? p : { id: 'mock' as const, model: `mock-${p.model}` }))
    : input.providers;

  const tasks = safe.map((p) => dispatchOne(input.case, p));
  return Promise.all(tasks);
}

async function dispatchOne(c: Case, p: ProviderSpec): Promise<ModelResult> {
  switch (p.id) {
    case 'openai':
      return runOpenAI(c, p.model);
    case 'anthropic':
      return runAnthropic(c, p.model);
    case 'mock':
    default:
      return runMock(c, p.model);
  }
}

/**
 * 根据环境变量拼出当前能用的 provider 列表。
 * - Demo 模式：永远只返回 mock，避免线上 demo 烧 key
 * - 普通模式：按 key 实际配置情况返回；mock 始终附在后面，没 key 时也能跑完整流程
 */
export function availableProviders(): ProviderSpec[] {
  if (isDemoMode()) {
    return [
      { id: 'mock', model: 'mock-fast' },
      { id: 'mock', model: 'mock-careful' },
    ];
  }

  const list: ProviderSpec[] = [];
  if (process.env.OPENAI_API_KEY) {
    list.push({ id: 'openai', model: process.env.OPENAI_MODEL || 'gpt-4o' });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    list.push({
      id: 'anthropic',
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514',
    });
  }
  list.push({ id: 'mock', model: 'mock-fast' });
  list.push({ id: 'mock', model: 'mock-careful' });
  return list;
}
