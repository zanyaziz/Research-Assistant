import { v4 as uuidv4 } from 'uuid';
import db from '../connection';

export interface Brief {
  id: string;
  run_id: string;
  topic_id: string;
  headline?: string;
  content: Record<string, any>;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  brief_date: string;
  created_at?: string;
}

function parse(row: any): Brief {
  return {
    ...row,
    content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
  };
}

export const BriefModel = {
  async create(data: Omit<Brief, 'id' | 'created_at'>): Promise<Brief> {
    const id = uuidv4();
    await db('briefs').insert({
      id,
      ...data,
      content: JSON.stringify(data.content),
      created_at: new Date().toISOString(),
    });
    return (await BriefModel.findById(id))!;
  },

  async findById(id: string): Promise<Brief | undefined> {
    const row = await db('briefs').where({ id }).first();
    return row ? parse(row) : undefined;
  },

  async findAll(filters: { topic_id?: string; date?: string; confidence?: string } = {}): Promise<Brief[]> {
    const q = db('briefs').orderBy('brief_date', 'desc');
    if (filters.topic_id) q.where({ topic_id: filters.topic_id });
    if (filters.date) q.where({ brief_date: filters.date });
    if (filters.confidence) q.where({ confidence: filters.confidence });
    const rows = await q;
    return rows.map(parse);
  },

  async findToday(): Promise<Brief[]> {
    const today = new Date().toISOString().split('T')[0];
    return BriefModel.findAll({ date: today });
  },

  async search(query: string): Promise<Brief[]> {
    const rows = await db('briefs')
      .whereRaw("headline LIKE ? OR content LIKE ?", [`%${query}%`, `%${query}%`])
      .orderBy('brief_date', 'desc');
    return rows.map(parse);
  },
};
