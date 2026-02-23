import { v4 as uuidv4 } from 'uuid';
import db from '../connection';

export interface ResearchRun {
  id: string;
  topic_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  stats?: Record<string, any>;
  error?: string;
  created_at?: string;
}

function parse(row: any): ResearchRun {
  return {
    ...row,
    stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : row.stats,
  };
}

export const ResearchRunModel = {
  async create(topic_id: string): Promise<ResearchRun> {
    const id = uuidv4();
    await db('research_runs').insert({ id, topic_id, status: 'pending', created_at: new Date().toISOString() });
    return (await ResearchRunModel.findById(id))!;
  },

  async findById(id: string): Promise<ResearchRun | undefined> {
    const row = await db('research_runs').where({ id }).first();
    return row ? parse(row) : undefined;
  },

  async findByTopic(topic_id: string): Promise<ResearchRun[]> {
    const rows = await db('research_runs').where({ topic_id }).orderBy('created_at', 'desc');
    return rows.map(parse);
  },

  async findAll(filters: { topic_id?: string; status?: string } = {}): Promise<ResearchRun[]> {
    const q = db('research_runs').orderBy('created_at', 'desc');
    if (filters.topic_id) q.where({ topic_id: filters.topic_id });
    if (filters.status) q.where({ status: filters.status });
    const rows = await q;
    return rows.map(parse);
  },

  async updateStatus(id: string, status: ResearchRun['status'], extra: Partial<ResearchRun> = {}): Promise<void> {
    const payload: any = { status, ...extra };
    if (extra.stats) payload.stats = JSON.stringify(extra.stats);
    await db('research_runs').where({ id }).update(payload);
  },
};
