import { synthesizePrompt } from '../prompts/synthesize.prompt';
import { BriefSchema, type BriefOutput } from '../outputSchemas';
import { buildLlm } from '../llmFactory';
import { logger } from '../../utils/logger';
import type { AnalysisOutput } from '../outputSchemas';
import type { ScrapedItem } from '../../adapters/SourceAdapter';

export async function synthesizeBrief(
  analyzedItems: Array<ScrapedItem & { analysis: AnalysisOutput }>,
  topic: { name: string; quality_criteria: Record<string, any> }
): Promise<BriefOutput> {
  const llm = buildLlm();
  const chain = synthesizePrompt.pipe(llm);

  const qc = topic.quality_criteria;
  const analyzedSources = analyzedItems
    .map((item, i) =>
      `[${i + 1}] ${item.url}\nTitle: ${item.title}\nSummary: ${item.analysis.summary}\nKey Facts: ${item.analysis.keyFacts.join(', ')}\nRelevance: ${item.analysis.relevance}`
    )
    .join('\n\n');

  logger.info(`synthesizeChain: starting — ${analyzedItems.length} sources`);
  const chainStart = Date.now();

  const response = await chain.invoke({
    topicName: topic.name,
    goodOutputCriteria: (qc.goodOutput || []).join('\n- ') || 'N/A',
    badOutputCriteria: (qc.badOutput || []).join('\n- ') || 'N/A',
    outputFormat: qc.outputFormat || 'structured_brief',
    maxLength: qc.maxLength || 2000,
    tone: qc.tone || 'analytical',
    analyzedSources,
  });

  const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  logger.debug(`synthesizeChain: LLM response — ${text.length} chars in ${Date.now() - chainStart}ms`);

  function extractJson(raw: string): unknown {
    const stripped = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    try { return JSON.parse(stripped); } catch { /* fall through */ }
    const s = stripped.indexOf('{');
    const e = stripped.lastIndexOf('}');
    if (s !== -1 && e > s) return JSON.parse(stripped.slice(s, e + 1));
    throw new SyntaxError(`No JSON object found in LLM response`);
  }

  try {
    const brief = BriefSchema.parse(extractJson(text));
    logger.info(`synthesizeChain: done — confidence=${brief.confidence}, ${brief.keyFindings.length} findings in ${((Date.now() - chainStart) / 1000).toFixed(1)}s`);
    return brief;
  } catch (err) {
    logger.warn('synthesizeChain: output did not match schema, returning raw', { err });
    return {
      headline: 'Research brief generated',
      keyFindings: [text.slice(0, 500)],
      analysis: text,
      sources: analyzedItems.map((i) => i.url),
      confidence: 'LOW',
      followUpQuestions: [],
    };
  }
}
