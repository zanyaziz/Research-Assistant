import { analyzePrompt } from '../prompts/analyze.prompt';
import { AnalysisSchema, type AnalysisOutput } from '../outputSchemas';
import { buildLlm } from '../llmFactory';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import type { ScrapedItem } from '../../adapters/SourceAdapter';

function extractJson(text: string): unknown {
  const stripped = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  try { return JSON.parse(stripped); } catch { /* fall through */ }
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start !== -1 && end > start) return JSON.parse(stripped.slice(start, end + 1));
  throw new SyntaxError(`No JSON object found in LLM response`);
}

export async function analyzeItems(
  items: ScrapedItem[],
  topic: { name: string; quality_criteria: Record<string, any> }
): Promise<Array<ScrapedItem & { analysis: AnalysisOutput }>> {
  const llm = buildLlm();
  const chain = analyzePrompt.pipe(llm);
  const goodOutput = (topic.quality_criteria.goodOutput || []).join('\n- ');
  const badOutput = (topic.quality_criteria.badOutput || []).join('\n- ');
  const concurrency = config.llm.concurrency;

  const results: Array<ScrapedItem & { analysis: AnalysisOutput } | null> = new Array(items.length).fill(null);
  let nextIndex = 0;
  let doneCount = 0;
  let failCount = 0;
  const total = items.length;
  const pipelineStart = Date.now();

  logger.info(`analyzeChain: starting — ${total} items, concurrency=${concurrency}`);

  async function worker(workerId: number) {
    while (nextIndex < total) {
      const i = nextIndex++;
      const item = items[i];
      const contentLen = item.rawContent?.length ?? 0;
      logger.debug(`analyzeChain [w${workerId}]: item ${i + 1}/${total} — ${item.url} (${contentLen} chars)`);
      const itemStart = Date.now();
      try {
        const response = await chain.invoke({
          topicName: topic.name,
          goodOutput: goodOutput ? `- ${goodOutput}` : 'N/A',
          badOutput: badOutput ? `- ${badOutput}` : 'N/A',
          url: item.url,
          title: item.title,
          content: item.rawContent?.slice(0, 3000) || '',
        });
        const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        const parsed = AnalysisSchema.parse(extractJson(text));
        results[i] = { ...item, analysis: parsed };
        doneCount++;
        logger.debug(
          `analyzeChain [w${workerId}]: ✓ item ${i + 1}/${total} in ${Date.now() - itemStart}ms` +
          ` — relevance=${parsed.relevance} score=${parsed.qualityScore} — ${item.url}`
        );
      } catch (err: any) {
        failCount++;
        logger.warn(`analyzeChain [w${workerId}]: ✗ item ${i + 1}/${total} in ${Date.now() - itemStart}ms — ${item.url}`, { message: err.message });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, (_, k) => worker(k + 1)));

  logger.info(`analyzeChain: done — ${doneCount} ok, ${failCount} failed, ${total} total in ${((Date.now() - pipelineStart) / 1000).toFixed(1)}s`);

  return results.filter((r): r is ScrapedItem & { analysis: AnalysisOutput } => r !== null);
}
