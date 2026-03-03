import * as cron from 'node-cron';
import { TopicModel } from '../db/models/Topic';
import { ResearchRunModel } from '../db/models/ResearchRun';
import { BriefModel } from '../db/models/Brief';
import { DailyDigestModel } from '../db/models/DailyDigest';
import { runResearchPipeline } from '../pipeline/ResearchPipeline';
import { sendWebhook } from '../utils/notifications';
import { logger } from '../utils/logger';

const activeTasks = new Map<string, cron.ScheduledTask>();

// Global run queue — ensures topic pipelines execute one at a time, preventing
// multiple simultaneous full-pipeline runs from overloading the system.
let runQueue: Promise<void> = Promise.resolve();

function enqueueRun(fn: () => Promise<void>): void {
  runQueue = runQueue.then(fn).catch(() => {});
}

export async function startScheduler(): Promise<void> {
  logger.info('CronScheduler: starting');
  await rescheduleAll();
  scheduleDailyDigest();
}

export async function rescheduleAll(): Promise<void> {
  // Stop existing tasks
  for (const [id, task] of activeTasks.entries()) {
    task.stop();
    activeTasks.delete(id);
  }

  const topics = await TopicModel.findAll();
  for (const topic of topics) {
    if (!topic.enabled) continue;
    scheduleTopicRun(topic);
  }

  logger.info(`CronScheduler: scheduled ${activeTasks.size} topic(s)`);
}

export function scheduleTopicRun(topic: { id: string; name: string; schedule: string }): void {
  if (!cron.validate(topic.schedule)) {
    logger.warn(`CronScheduler: invalid cron expression for topic "${topic.name}": ${topic.schedule}`);
    return;
  }

  const task = cron.schedule(topic.schedule, () => {
    logger.info(`CronScheduler: queuing run for topic "${topic.name}"`);
    enqueueRun(async () => {
      try {
        const fullTopic = await TopicModel.findById(topic.id);
        if (!fullTopic || !fullTopic.enabled) return;
        // Pre-create the run record. No progress emitter for cron runs.
        const run = await ResearchRunModel.create(fullTopic.id);
        await runResearchPipeline(fullTopic, run.id);
      } catch (err: any) {
        logger.error(`CronScheduler: run failed for "${topic.name}"`, { message: err.message });
      }
    });
  });

  activeTasks.set(topic.id, task);
}

// Daily digest runs once at 23:55 regardless of how many topics fired that day.
function scheduleDailyDigest(): void {
  cron.schedule('55 23 * * *', async () => {
    try {
      await generateDailyDigest();
    } catch (err: any) {
      logger.error('CronScheduler: daily digest failed', { message: err.message });
    }
  });
}

async function generateDailyDigest(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const briefs = await BriefModel.findAll({ date: today });

  if (briefs.length === 0) return;

  const summary = briefs
    .map((b) => `• ${b.headline}`)
    .join('\n');

  const digest = await DailyDigestModel.upsert(
    today,
    summary,
    briefs.map((b) => b.id)
  );

  const msg = `Daily Research Digest — ${today}\n\n${summary}`;
  await sendWebhook(msg);
  logger.info(`CronScheduler: daily digest generated for ${today} with ${briefs.length} brief(s)`);
}
