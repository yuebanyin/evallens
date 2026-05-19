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

/** Dispatch one case to N providers in parallel. */
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

/** Convenience: list providers usable in the current environment. */
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
  // Mock is always available — for demo / dev.
  list.push({ id: 'mock', model: 'mock-fast' });
  list.push({ id: 'mock', model: 'mock-careful' });
  return list;
}
