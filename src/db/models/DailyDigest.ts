import { v4 as uuidv4 } from 'uuid';
import db from '../connection';

export interface DailyDigest {
  id: string;
  digest_date: string;
  summary?: string;
  topic_briefs: string[];
  created_at?: string;
}

function parse(row: any): DailyDigest {
  return {
    ...row,
    topic_briefs: typeof row.topic_briefs === 'string' ? JSON.parse(row.topic_briefs) : row.topic_briefs,
  };
}

export const DailyDigestModel = {
  async upsert(digest_date: string, summary: string, topic_briefs: string[]): Promise<DailyDigest> {
    const existing = await db('daily_digests').where({ digest_date }).first();
    if (existing) {
      await db('daily_digests')
        .where({ digest_date })
        .update({ summary, topic_briefs: JSON.stringify(topic_briefs) });
      return (await DailyDigestModel.findByDate(digest_date))!;
    }
    const id = uuidv4();
    await db('daily_digests').insert({
      id,
      digest_date,
      summary,
      topic_briefs: JSON.stringify(topic_briefs),
      created_at: new Date().toISOString(),
    });
    return (await DailyDigestModel.findByDate(digest_date))!;
  },

  async findAll(): Promise<DailyDigest[]> {
    const rows = await db('daily_digests').orderBy('digest_date', 'desc');
    return rows.map(parse);
  },

  async findLatest(): Promise<DailyDigest | undefined> {
    const row = await db('daily_digests').orderBy('digest_date', 'desc').first();
    return row ? parse(row) : undefined;
  },

  async findByDate(date: string): Promise<DailyDigest | undefined> {
    const row = await db('daily_digests').where({ digest_date: date }).first();
    return row ? parse(row) : undefined;
  },
};
