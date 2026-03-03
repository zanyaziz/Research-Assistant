import { Router } from 'express';
import { ResearchRunModel } from '../db/models/ResearchRun';
import { ScrapedItemModel } from '../db/models/ScrapedItem';
import { getRunProgress } from '../progress/RunProgressRegistry';
import type { ProgressEvent } from '../progress/types';

const router = Router();

router.get('/', async (req, res) => {
  const { topic_id, status } = req.query as Record<string, string>;
  const runs = await ResearchRunModel.findAll({ topic_id, status });
  res.json(runs);
});

router.get('/:id', async (req, res) => {
  const id = req.params['id'] as string;
  const run = await ResearchRunModel.findById(id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  const items = await ScrapedItemModel.findByRun(run.id);
  res.json({ ...run, items });
});

// SSE endpoint — streams ProgressEvents for an active run.
// The client (EventSource) connects after receiving the runId from POST /topics/:id/run.
router.get('/:id/stream', async (req, res) => {
  const id = req.params['id'] as string;

  // Verify run exists before committing to SSE headers
  const run = await ResearchRunModel.findById(id);
  if (!run) return res.status(404).json({ error: 'Not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering
  res.flushHeaders();

  // Tell browser to reconnect after 3s if disconnected
  res.write('retry: 3000\n\n');

  function send(event: ProgressEvent) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  // Keepalive comment every 25s so proxies don't close the connection
  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 25_000);

  const emitter = getRunProgress(id);

  if (!emitter) {
    // Run may already be complete (fast run or client reconnect after server restart)
    if (run.status === 'completed') {
      // briefId isn't stored on the run — frontend will fetch /api/runs/:id to find it
      send({ type: 'done', briefId: '' });
    } else if (run.status === 'failed') {
      send({ type: 'error', message: run.error || 'Run failed' });
    }
    clearInterval(keepalive);
    res.end();
    return;
  }

  const onData = (event: ProgressEvent) => send(event);
  emitter.on('data', onData);

  req.on('close', () => {
    clearInterval(keepalive);
    emitter.off('data', onData);
  });
});

export default router;
