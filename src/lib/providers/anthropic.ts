import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { Case, ModelResult } from '../types';
import { annotateSanity } from '../sanity-check';
import { heuristicScore } from '../rubric';

export async function runAnthropic(c: Case, model: string): Promise<ModelResult> {
  const started = Date.now();
  try {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { text, usage } = await generateText({
      model: anthropic(model),
      prompt: c.prompt,
    });
    const result = annotateSanity(c, {
      provider: 'anthropic',
      model,
      output: text,
      latencyMs: Date.now() - started,
      inputTokens: usage?.promptTokens,
      outputTokens: usage?.completionTokens,
    });
    result.scores = heuristicScore(c, text);
    return result;
  } catch (err) {
    return annotateSanity(c, {
      provider: 'anthropic',
      model,
      output: '',
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
