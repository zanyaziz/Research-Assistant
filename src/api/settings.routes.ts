import { Router, type Request, type Response } from 'express';
import { config } from '../config';

const router = Router();

// Expose non-secret config for the UI
router.get('/', (_req: Request, res: Response) => {
  res.json({
    llm: {
      provider: config.llm.provider,
      model: config.llm.model,
      temperature: config.llm.temperature,
    },
    scraping: {
      rateLimitMs: config.scraping.rateLimitMs,
      userAgent: config.scraping.userAgent,
      puppeteerHeadless: config.scraping.puppeteerHeadless,
    },
    vectorStore: config.vectorStore,
    server: {
      port: config.port,
      nodeEnv: config.nodeEnv,
    },
  });
});

export default router;
