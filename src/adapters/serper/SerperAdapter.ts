import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import type { SourceAdapter, ScrapedItem } from '../SourceAdapter';
import { htmlToText } from '../../scraper/extractor';
import { fetchHtml } from '../../scraper/fetcher';
import { config } from '../../config';
import { logger } from '../../utils/logger';

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  position?: number;
}

interface SerperResponse {
  organic?: SerperResult[];
}

export class SerperAdapter implements SourceAdapter {
  // Kept as 'google' so existing topic configs need no changes
  name = 'google';
  description = 'Search the web via Serper (Google SERP API — 2,500 free queries)';

  configSchema = {
    type: 'object',
    properties: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Search queries to run',
      },
      maxResults: { type: 'number', default: 10, description: 'Results per query (max 10)' },
      dateRestrict: {
        type: 'string',
        description: 'Recency filter: "past 24 hours", "past week", "past month" (maps to Serper tbs param)',
      },
    },
    required: ['queries'],
  };

  async fetch(cfg: Record<string, any>): Promise<ScrapedItem[]> {
    const apiKey = config.serper.apiKey;
    if (!apiKey) {
      logger.warn('SerperAdapter: SERPER_API_KEY not set');
      return [];
    }

    const queries: string[] = cfg.queries || [];
    const maxResults: number = Math.min(cfg.maxResults || 10, 10);
    const items: ScrapedItem[] = [];

    for (const query of queries) {
      try {
        const body: Record<string, any> = { q: query, num: maxResults };
        if (cfg.dateRestrict) body.tbs = this.mapDateRestrict(cfg.dateRestrict);

        const { data } = await axios.post<SerperResponse>(
          'https://google.serper.dev/search',
          body,
          {
            headers: {
              'X-API-KEY': apiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        for (const result of data.organic || []) {
          let rawContent = result.snippet;
          try {
            const html = await fetchHtml(result.link);
            const extracted = htmlToText(html, result.link);
            rawContent = extracted.text.slice(0, 10000);
          } catch {
            // Fall back to snippet if full page fetch fails
          }

          items.push({
            id: uuidv4(),
            sourceType: 'google',
            url: result.link,
            title: result.title,
            rawContent,
            snippet: result.snippet,
            publishedAt: result.date ? new Date(result.date) : undefined,
            metadata: { query, position: result.position },
            scrapedAt: new Date(),
          });
        }
      } catch (err: any) {
        logger.error(`SerperAdapter: query failed for "${query}"`, { message: err.message });
      }
    }

    return items;
  }

  // Map the Google-style dateRestrict strings to Serper's tbs param
  private mapDateRestrict(dateRestrict: string): string {
    const map: Record<string, string> = {
      d1: 'qdr:d',   // past 24 hours
      w1: 'qdr:w',   // past week
      m1: 'qdr:m',   // past month
      y1: 'qdr:y',   // past year
    };
    return map[dateRestrict] ?? `qdr:${dateRestrict}`;
  }
}
