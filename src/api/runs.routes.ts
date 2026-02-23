import { Router } from 'express';
import { ResearchRunModel } from '../db/models/ResearchRun';
import { ScrapedItemModel } from '../db/models/ScrapedItem';

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

export default router;
