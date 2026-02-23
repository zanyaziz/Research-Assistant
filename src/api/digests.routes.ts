import { Router } from 'express';
import { DailyDigestModel } from '../db/models/DailyDigest';

const router = Router();

router.get('/', async (_req, res) => {
  const digests = await DailyDigestModel.findAll();
  res.json(digests);
});

router.get('/latest', async (_req, res) => {
  const digest = await DailyDigestModel.findLatest();
  if (!digest) return res.status(404).json({ error: 'No digest yet' });
  res.json(digest);
});

router.get('/:date', async (req, res) => {
  const date = req.params['date'] as string;
  const digest = await DailyDigestModel.findByDate(date);
  if (!digest) return res.status(404).json({ error: 'Not found' });
  res.json(digest);
});

export default router;
