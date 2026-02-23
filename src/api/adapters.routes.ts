import { Router, type Request, type Response } from 'express';
import { registry } from '../adapters/AdapterRegistry';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const adapters = registry.getAll().map((a) => ({
    name: a.name,
    description: a.description,
    configSchema: a.configSchema,
  }));
  res.json(adapters);
});

export default router;
