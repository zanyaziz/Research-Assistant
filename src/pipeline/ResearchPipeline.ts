import { EventEmitter } from 'events';
import { registry } from '../adapters/AdapterRegistry';
import { filterAndDedup } from './chains/filterChain';
import { analyzeItems } from './chains/analyzeChain';
import { synthesizeBrief } from './chains/synthesizeChain';
import { ResearchRunModel } from '../db/models/ResearchRun';
import { ScrapedItemModel } from '../db/models/ScrapedItem';
import { BriefModel } from '../db/models/Brief';
import { deleteRunProgress } from '../progress/RunProgressRegistry';
import type { ProgressEvent } from '../progress/types';
import { logger } from '../utils/logger';
import type { Topic } from '../db/models/Topic';

const ADAPTER_TIMEOUT_MS = parseInt(process.env.ADAPTER_TIMEOUT_MS || '300000', 10); // 5 min

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

function emit(progress: EventEmitter | undefined, event: ProgressEvent): void {
  progress?.emit('data', event);
}

function log(progress: EventEmitter | undefined, level: 'info' | 'warn' | 'error', message: string): void {
  emit(progress, { type: 'log', level, message, ts: new Date().toISOString() });
}

// runId must be a pre-created ResearchRun ID (created by the caller before firing
// the pipeline, so the frontend receives the ID before pipeline work begins).
// progress is optional — absent for cron/CLI-triggered runs (all emits are no-ops).
export async function runResearchPipeline(
  topic: Topic,
  runId: string,
  progress?: EventEmitter
): Promise<string> {
  logger.info(`ResearchPipeline: starting run ${runId} for topic "${topic.name}"`);

  try {
    await ResearchRunModel.updateStatus(runId, 'running', {
      started_at: new Date().toISOString(),
    });

    // Step 1: Gather from all configured adapters in parallel
    const adapterNames: string[] = topic.sources || [];
    if (adapterNames.length === 0) {
      throw new Error(`Topic "${topic.name}" has no sources configured — add at least one adapter in the topic settings`);
    }

    emit(progress, { type: 'step', step: 1, name: 'gather', status: 'running', pct: 0,
      detail: `0/${adapterNames.length} adapters` });
    log(progress, 'info', `Gathering from ${adapterNames.length} adapter(s): ${adapterNames.join(', ')}`);
    logger.info(`ResearchPipeline [1/5]: gathering from ${adapterNames.length} adapter(s): ${adapterNames.join(', ')}`);

    let t = Date.now();
    let adaptersDone = 0;
    const totalAdapters = adapterNames.length;

    const gatherResults = await Promise.allSettled(
      adapterNames.map(async (name) => {
        const adapter = registry.get(name);
        if (!adapter) {
          logger.warn(`ResearchPipeline: adapter "${name}" not registered`);
          log(progress, 'warn', `Adapter "${name}" not registered — skipping`);
          adaptersDone++;
          emit(progress, { type: 'step', step: 1, name: 'gather', status: 'running',
            pct: Math.round((adaptersDone / totalAdapters) * 100),
            detail: `${adaptersDone}/${totalAdapters} adapters` });
          return [];
        }
        const adapterConfig = topic.source_config?.[name] || {};
        try {
          const result = await withTimeout(adapter.fetch(adapterConfig), ADAPTER_TIMEOUT_MS, `adapter:${name}`);
          adaptersDone++;
          emit(progress, { type: 'step', step: 1, name: 'gather', status: 'running',
            pct: Math.round((adaptersDone / totalAdapters) * 100),
            detail: `${adaptersDone}/${totalAdapters} adapters` });
          log(progress, 'info', `Adapter "${name}" returned ${result.length} item(s)`);
          return result;
        } catch (err: any) {
          adaptersDone++;
          emit(progress, { type: 'step', step: 1, name: 'gather', status: 'running',
            pct: Math.round((adaptersDone / totalAdapters) * 100),
            detail: `${adaptersDone}/${totalAdapters} adapters` });
          log(progress, 'warn', `Adapter "${name}" failed: ${err.message}`);
          throw err;
        }
      })
    );

    const allItems = gatherResults.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    const failedAdapters = gatherResults.filter((r) => r.status === 'rejected').length;
    const gatherSummary = `${allItems.length} raw items gathered in ${((Date.now() - t) / 1000).toFixed(1)}s` +
      (failedAdapters ? ` (${failedAdapters} adapter(s) failed)` : '');
    logger.info(`ResearchPipeline [1/5]: ${gatherSummary}`);
    emit(progress, { type: 'step', step: 1, name: 'gather', status: 'done', pct: 100, detail: gatherSummary });

    // Step 2: Filter & deduplicate
    emit(progress, { type: 'step', step: 2, name: 'filter', status: 'running', pct: 0,
      detail: `${allItems.length} items` });
    logger.info(`ResearchPipeline [2/5]: filtering ${allItems.length} items`);
    t = Date.now();
    const filtered = filterAndDedup(allItems);
    logger.info(`ResearchPipeline [2/5]: ${filtered.length} items after filter/dedup in ${((Date.now() - t) / 1000).toFixed(1)}s`);
    log(progress, 'info', `${filtered.length} items after dedup/filter (removed ${allItems.length - filtered.length} duplicates)`);
    emit(progress, { type: 'step', step: 2, name: 'filter', status: 'done', pct: 100,
      detail: `${filtered.length} items` });

    // Step 3: Store scraped items
    emit(progress, { type: 'step', step: 3, name: 'store', status: 'running', pct: 0 });
    logger.info(`ResearchPipeline [3/5]: storing ${filtered.length} scraped items`);
    t = Date.now();
    if (filtered.length > 0) {
      await ScrapedItemModel.bulkInsert(runId, filtered);
    }
    logger.info(`ResearchPipeline [3/5]: stored in ${((Date.now() - t) / 1000).toFixed(1)}s`);
    emit(progress, { type: 'step', step: 3, name: 'store', status: 'done', pct: 100 });

    // Step 4: Analyze each item
    emit(progress, { type: 'step', step: 4, name: 'analyze', status: 'running', pct: 0,
      detail: `0/${filtered.length} items` });
    log(progress, 'info', `Analyzing ${filtered.length} items (LLM concurrency=${require('../config').config.llm.concurrency})`);
    logger.info(`ResearchPipeline [4/5]: analyzing ${filtered.length} items`);
    t = Date.now();
    const analyzed = await analyzeItems(filtered, topic, progress);
    logger.info(`ResearchPipeline [4/5]: ${analyzed.length}/${filtered.length} items analyzed in ${((Date.now() - t) / 1000).toFixed(1)}s`);
    emit(progress, { type: 'step', step: 4, name: 'analyze', status: 'done', pct: 100,
      detail: `${analyzed.length}/${filtered.length} items` });

    // Step 5: Synthesize brief
    if (analyzed.length === 0) {
      throw new Error(`No items survived analysis for topic "${topic.name}" — check adapter config, content filters, and LLM connectivity`);
    }
    emit(progress, { type: 'step', step: 5, name: 'synthesize', status: 'running', pct: 0,
      detail: `${analyzed.length} analyzed items` });
    log(progress, 'info', `Synthesizing brief from ${analyzed.length} analyzed items`);
    logger.info(`ResearchPipeline [5/5]: synthesizing brief from ${analyzed.length} analyzed items`);
    t = Date.now();
    const briefOutput = await synthesizeBrief(analyzed, topic);
    logger.info(`ResearchPipeline [5/5]: brief synthesized in ${((Date.now() - t) / 1000).toFixed(1)}s`);
    emit(progress, { type: 'step', step: 5, name: 'synthesize', status: 'done', pct: 100 });

    // Store brief
    const today = new Date().toISOString().split('T')[0];
    const brief = await BriefModel.create({
      run_id: runId,
      topic_id: topic.id,
      headline: briefOutput.headline,
      content: briefOutput,
      confidence: briefOutput.confidence,
      brief_date: today,
    });

    await ResearchRunModel.updateStatus(runId, 'completed', {
      completed_at: new Date().toISOString(),
      stats: {
        sources_queried: adapterNames.length,
        items_scraped: allItems.length,
        items_relevant: filtered.length,
        items_analyzed: analyzed.length,
      },
    });

    logger.info(`ResearchPipeline: completed run ${runId}, brief ${brief.id}`);
    log(progress, 'info', `Run complete — brief "${briefOutput.headline}"`);
    emit(progress, { type: 'done', briefId: brief.id });
    return brief.id;
  } catch (err: any) {
    logger.error(`ResearchPipeline: run ${runId} failed`, { message: err.message, stack: err.stack });
    log(progress, 'error', `Run failed: ${err.message}`);
    emit(progress, { type: 'error', message: err.message });
    await ResearchRunModel.updateStatus(runId, 'failed', {
      completed_at: new Date().toISOString(),
      error: err.message,
    });
    throw err;
  } finally {
    deleteRunProgress(runId);
  }
}
