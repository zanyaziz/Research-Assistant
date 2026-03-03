import { Router } from 'express';
import { TopicModel } from '../db/models/Topic';
import { ResearchRunModel } from '../db/models/ResearchRun';
import { runResearchPipeline } from '../pipeline/ResearchPipeline';
import { createRunProgress } from '../progress/RunProgressRegistry';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', async (_req, res) => {
  const topics = await TopicModel.findAll();
  res.json(topics);
});

router.post('/', async (req, res) => {
  try {
    const topic = await TopicModel.create(req.body);
    res.status(201).json(topic);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const id = req.params['id'] as string;
  const topic = await TopicModel.findById(id);
  if (!topic) return res.status(404).json({ error: 'Not found' });
  res.json(topic);
});

router.put('/:id', async (req, res) => {
  const id = req.params['id'] as string;
  const topic = await TopicModel.update(id, req.body);
  if (!topic) return res.status(404).json({ error: 'Not found' });
  res.json(topic);
});

router.delete('/:id', async (req, res) => {
  const id = req.params['id'] as string;
  await TopicModel.delete(id);
  res.status(204).send();
});

router.post('/:id/run', async (req, res) => {
  const id = req.params['id'] as string;
  const topic = await TopicModel.findById(id);
  if (!topic) return res.status(404).json({ error: 'Not found' });

  // Create the run record and progress emitter BEFORE responding so the
  // client receives the runId and can open the SSE stream immediately.
  const run = await ResearchRunModel.create(topic.id);
  const progress = createRunProgress(run.id);

  runResearchPipeline(topic, run.id, progress).catch((err) => {
    logger.error('Manual run failed', { topicId: topic.id, runId: run.id, message: err.message });
  });

  res.json({ runId: run.id });
});

export default router;
