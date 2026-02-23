import { v4 as uuidv4 } from 'uuid';
import db from '../connection';
import type { ScrapedItem as ScrapedItemData } from '../../adapters/SourceAdapter';

export interface ScrapedItemRow {
  id: string;
  run_id: string;
  source_type: string;
  url: string;
  title?: string;
  raw_content?: string;
  snippet?: string;
  author?: string;
  published_at?: string;
  metadata?: Record<string, any>;
  relevance_score?: number;
  scraped_at?: string;
}

function parse(row: any): ScrapedItemRow {
  return {
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
  };
}

export const ScrapedItemModel = {
  async bulkInsert(run_id: string, items: ScrapedItemData[]): Promise<void> {
    const rows = items.map((item) => ({
      id: uuidv4(),
      run_id,
      source_type: item.sourceType,
      url: item.url,
      title: item.title,
      raw_content: item.rawContent,
      snippet: item.snippet,
      author: item.author,
      published_at: item.publishedAt && !isNaN(item.publishedAt.getTime()) ? item.publishedAt.toISOString() : undefined,
      metadata: JSON.stringify(item.metadata || {}),
      relevance_score: (item as any).relevanceScore,
      scraped_at: item.scrapedAt && !isNaN(item.scrapedAt.getTime()) ? item.scrapedAt.toISOString() : new Date().toISOString(),
    }));
    await db('scraped_items').insert(rows);
  },

  async findByRun(run_id: string): Promise<ScrapedItemRow[]> {
    const rows = await db('scraped_items').where({ run_id });
    return rows.map(parse);
  },
};
