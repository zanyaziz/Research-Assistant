import express from 'express';
import * as path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import db from './db/connection';

// Adapters
import { registry } from './adapters/AdapterRegistry';
import { SerperAdapter } from './adapters/serper/SerperAdapter';
import { WebScraperAdapter } from './adapters/web/WebScraperAdapter';
import { RedditAdapter } from './adapters/reddit/RedditAdapter';
import { TwitterAdapter } from './adapters/twitter/TwitterAdapter';
import { ZillowAdapter } from './adapters/zillow/ZillowAdapter';
import { LoopNetAdapter } from './adapters/loopnet/LoopNetAdapter';
import { BizBuySellAdapter } from './adapters/bizbuysell/BizBuySellAdapter';

// API Routes
import topicsRouter from './api/topics.routes';
import briefsRouter from './api/briefs.routes';
import runsRouter from './api/runs.routes';
import adaptersRouter from './api/adapters.routes';
import digestsRouter from './api/digests.routes';
import settingsRouter from './api/settings.routes';

// Scheduler
import { startScheduler } from './scheduler/CronScheduler';

async function bootstrap() {
  // Register all adapters
  registry.register(new SerperAdapter());
  registry.register(new WebScraperAdapter());
  registry.register(new RedditAdapter());
  registry.register(new TwitterAdapter());
  registry.register(new ZillowAdapter());
  registry.register(new LoopNetAdapter());
  registry.register(new BizBuySellAdapter());

  // Run DB migrations
  await db.migrate.latest({
    directory: path.resolve(__dirname, '../migrations'),
  });
  logger.info('Database migrations complete');

  const app = express();
  app.use(express.json());

  // Serve React frontend in production
  if (config.nodeEnv === 'production') {
    const webDist = path.resolve(__dirname, '../web/dist');
    app.use(express.static(webDist));
  }

  // API routes
  app.use('/api/topics', topicsRouter);
  app.use('/api/briefs', briefsRouter);
  app.use('/api/runs', runsRouter);
  app.use('/api/adapters', adaptersRouter);
  app.use('/api/digests', digestsRouter);
  app.use('/api/settings', settingsRouter);

  // Full-text search
  app.get('/api/search', async (req, res) => {
    const q = (req.query.q as string) || '';
    if (!q.trim()) return res.json([]);
    const { BriefModel } = await import('./db/models/Brief');
    const results = await BriefModel.search(q);
    res.json(results);
  });

  // SPA fallback in production
  if (config.nodeEnv === 'production') {
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, '../web/dist/index.html'));
    });
  }

  app.listen(config.port, () => {
    logger.info(`Research Assistant running on http://localhost:${config.port}`);
  });

  // Start cron scheduler
  await startScheduler();
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
