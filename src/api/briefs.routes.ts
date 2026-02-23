import { Router } from 'express';
import { BriefModel } from '../db/models/Brief';
import { ScrapedItemModel } from '../db/models/ScrapedItem';

const router = Router();

router.get('/', async (req, res) => {
  const { topic_id, date, confidence } = req.query as Record<string, string>;
  const briefs = await BriefModel.findAll({ topic_id, date, confidence });
  res.json(briefs);
});

router.get('/today', async (_req, res) => {
  const briefs = await BriefModel.findToday();
  res.json(briefs);
});

router.get('/:id', async (req, res) => {
  const id = req.params['id'] as string;
  const brief = await BriefModel.findById(id);
  if (!brief) return res.status(404).json({ error: 'Not found' });
  const sources = await ScrapedItemModel.findByRun(brief.run_id);
  res.json({ ...brief, sources });
});

export default router;
