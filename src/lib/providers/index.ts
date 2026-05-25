import type { Case, ModelResult, ProviderId } from '../types';
import { runOpenAI } from './openai';
import { runAnthropic } from './anthropic';
import { runMock } from './mock';

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
  const tasks = input.providers.map((p) => dispatchOne(input.case, p));
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
 * 没配任何 key 也不能让页面空着，所以 mock 始终附在后面。
 */
export function availableProviders(): ProviderSpec[] {
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
