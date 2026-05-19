import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { Case, ModelResult } from '../types';
import { annotateSanity } from '../sanity-check';
import { heuristicScore } from '../rubric';

export async function runOpenAI(c: Case, model: string): Promise<ModelResult> {
  const started = Date.now();
  try {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { text, usage } = await generateText({
      model: openai(model),
      prompt: c.prompt,
    });
    const result = annotateSanity(c, {
      provider: 'openai',
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
      provider: 'openai',
      model,
      output: '',
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
