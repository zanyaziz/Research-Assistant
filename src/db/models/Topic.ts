import { v4 as uuidv4 } from 'uuid';
import db from '../connection';

export interface Topic {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  schedule: string;
  sources: string[];
  source_config: Record<string, any>;
  quality_criteria: Record<string, any>;
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

function parse(row: any): Topic {
  return {
    ...row,
    sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : row.sources,
    source_config: typeof row.source_config === 'string' ? JSON.parse(row.source_config) : row.source_config,
    quality_criteria: typeof row.quality_criteria === 'string' ? JSON.parse(row.quality_criteria) : row.quality_criteria,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
  };
}

export const TopicModel = {
  async findAll(): Promise<Topic[]> {
    const rows = await db('topics').orderBy('created_at', 'desc');
    return rows.map(parse);
  },

  async findById(id: string): Promise<Topic | undefined> {
    const row = await db('topics').where({ id }).first();
    return row ? parse(row) : undefined;
  },

  async create(data: Omit<Topic, 'id' | 'created_at' | 'updated_at'>): Promise<Topic> {
    const id = uuidv4();
    const now = new Date().toISOString();
    await db('topics').insert({
      id,
      ...data,
      sources: JSON.stringify(data.sources),
      source_config: JSON.stringify(data.source_config),
      quality_criteria: JSON.stringify(data.quality_criteria),
      tags: JSON.stringify(data.tags),
      created_at: now,
      updated_at: now,
    });
    return (await TopicModel.findById(id))!;
  },

  async update(id: string, data: Partial<Omit<Topic, 'id' | 'created_at'>>): Promise<Topic | undefined> {
    const payload: any = { ...data, updated_at: new Date().toISOString() };
    if (data.sources) payload.sources = JSON.stringify(data.sources);
    if (data.source_config) payload.source_config = JSON.stringify(data.source_config);
    if (data.quality_criteria) payload.quality_criteria = JSON.stringify(data.quality_criteria);
    if (data.tags) payload.tags = JSON.stringify(data.tags);
    await db('topics').where({ id }).update(payload);
    return TopicModel.findById(id);
  },

  async delete(id: string): Promise<void> {
    await db('topics').where({ id }).delete();
  },
};
