import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import type { Case, Run } from './types';
import seedCases from '@/data/seed-cases.json';

/**
 * 本地持久化：每个 run 写成一个 JSON 文件，放在项目根目录的
 * `.evallens/runs/<id>.json`。
 *
 * 选 JSON 而不是数据库，是因为评测工具最关键的是"我的数据我自己掌握"——
 * 用户可以直接 grep、diff、丢进 git，不用为一个本地小工具装 Postgres。
 */

const ROOT = path.join(process.cwd(), '.evallens');
const RUNS_DIR = path.join(ROOT, 'runs');

function ensureDirs() {
  if (!existsSync(ROOT)) mkdirSync(ROOT);
  if (!existsSync(RUNS_DIR)) mkdirSync(RUNS_DIR);
}

export function listCases(): Case[] {
  return seedCases as Case[];
}

export function getCase(id: string): Case | undefined {
  return listCases().find((c) => c.id === id);
}

export async function saveRun(run: Run): Promise<void> {
  ensureDirs();
  await fs.writeFile(path.join(RUNS_DIR, `${run.id}.json`), JSON.stringify(run, null, 2), 'utf8');
}

export async function getRun(id: string): Promise<Run | undefined> {
  try {
    const raw = await fs.readFile(path.join(RUNS_DIR, `${id}.json`), 'utf8');
    return JSON.parse(raw) as Run;
  } catch {
    return undefined;
  }
}

export async function listRuns(): Promise<Run[]> {
  ensureDirs();
  const files = await fs.readdir(RUNS_DIR).catch(() => []);
  const runs: Run[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      runs.push(JSON.parse(await fs.readFile(path.join(RUNS_DIR, f), 'utf8')));
    } catch {
      /* ignore corrupt files */
    }
  }
  return runs.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export function newRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
