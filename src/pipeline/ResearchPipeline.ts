import { registry } from '../adapters/AdapterRegistry';
import { filterAndDedup } from './chains/filterChain';
import { analyzeItems } from './chains/analyzeChain';
import { synthesizeBrief } from './chains/synthesizeChain';
import { ResearchRunModel } from '../db/models/ResearchRun';
import { ScrapedItemModel } from '../db/models/ScrapedItem';
import { BriefModel } from '../db/models/Brief';
import { logger } from '../utils/logger';
import type { Topic } from '../db/models/Topic';

export async function runResearchPipeline(topic: Topic): Promise<string> {
  const run = await ResearchRunModel.create(topic.id);
  logger.info(`ResearchPipeline: starting run ${run.id} for topic "${topic.name}"`);

  try {
    await ResearchRunModel.updateStatus(run.id, 'running', {
      started_at: new Date().toISOString(),
    });

    // Step 1: Gather from all configured adapters in parallel
    const adapterNames: string[] = topic.sources || [];
    logger.info(`ResearchPipeline [1/5]: gathering from ${adapterNames.length} adapter(s): ${adapterNames.join(', ')}`);
    let t = Date.now();
    const gatherResults = await Promise.allSettled(
      adapterNames.map((name) => {
        const adapter = registry.get(name);
        if (!adapter) {
          logger.warn(`ResearchPipeline: adapter "${name}" not registered`);
          return Promise.resolve([]);
        }
        const adapterConfig = topic.source_config?.[name] || {};
        return adapter.fetch(adapterConfig);
      })
    );

    const allItems = gatherResults.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    const failedAdapters = gatherResults.filter((r) => r.status === 'rejected').length;
    logger.info(`ResearchPipeline [1/5]: gathered ${allItems.length} raw items in ${((Date.now() - t) / 1000).toFixed(1)}s` +
      (failedAdapters ? ` (${failedAdapters} adapter(s) failed)` : ''));

    // Step 2: Filter & deduplicate
    logger.info(`ResearchPipeline [2/5]: filtering ${allItems.length} items`);
    t = Date.now();
    const filtered = filterAndDedup(allItems);
    logger.info(`ResearchPipeline [2/5]: ${filtered.length} items after filter/dedup in ${((Date.now() - t) / 1000).toFixed(1)}s`);

    // Step 3: Store scraped items
    logger.info(`ResearchPipeline [3/5]: storing ${filtered.length} scraped items`);
    t = Date.now();
    if (filtered.length > 0) {
      await ScrapedItemModel.bulkInsert(run.id, filtered);
    }
    logger.info(`ResearchPipeline [3/5]: stored in ${((Date.now() - t) / 1000).toFixed(1)}s`);

    // Step 4: Analyze each item
    logger.info(`ResearchPipeline [4/5]: analyzing ${filtered.length} items`);
    t = Date.now();
    const analyzed = await analyzeItems(filtered, topic);
    logger.info(`ResearchPipeline [4/5]: ${analyzed.length}/${filtered.length} items analyzed in ${((Date.now() - t) / 1000).toFixed(1)}s`);

    // Step 5: Synthesize brief
    logger.info(`ResearchPipeline [5/5]: synthesizing brief from ${analyzed.length} analyzed items`);
    t = Date.now();
    const briefOutput = await synthesizeBrief(analyzed, topic);
    logger.info(`ResearchPipeline [5/5]: brief synthesized in ${((Date.now() - t) / 1000).toFixed(1)}s`);

    // Step 6: Store brief
    const today = new Date().toISOString().split('T')[0];
    const brief = await BriefModel.create({
      run_id: run.id,
      topic_id: topic.id,
      headline: briefOutput.headline,
      content: briefOutput,
      confidence: briefOutput.confidence,
      brief_date: today,
    });

    await ResearchRunModel.updateStatus(run.id, 'completed', {
      completed_at: new Date().toISOString(),
      stats: {
        sources_queried: adapterNames.length,
        items_scraped: allItems.length,
        items_relevant: filtered.length,
        items_analyzed: analyzed.length,
      },
    });

    logger.info(`ResearchPipeline: completed run ${run.id}, brief ${brief.id}`);
    return brief.id;
  } catch (err: any) {
    logger.error(`ResearchPipeline: run ${run.id} failed`, { message: err.message, stack: err.stack });
    await ResearchRunModel.updateStatus(run.id, 'failed', {
      completed_at: new Date().toISOString(),
      error: err.message,
    });
    throw err;
  }
}
