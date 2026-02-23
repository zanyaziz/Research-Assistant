import { v4 as uuidv4 } from 'uuid';
import type { SourceAdapter, ScrapedItem } from '../SourceAdapter';
import { fetchHtml } from '../../scraper/fetcher';
import { logger } from '../../utils/logger';
import * as cheerio from 'cheerio';

// Uses public Nitter instances for scraping — no API key required.
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
];

export class TwitterAdapter implements SourceAdapter {
  name = 'twitter';
  description = 'Scrape X/Twitter via public Nitter instances (no API key required)';

  configSchema = {
    type: 'object',
    properties: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Search queries or hashtags',
      },
      accounts: {
        type: 'array',
        items: { type: 'string' },
        description: 'Twitter handles to fetch (without @)',
      },
      maxTweets: { type: 'number', default: 20 },
    },
  };

  async fetch(cfg: Record<string, any>): Promise<ScrapedItem[]> {
    const items: ScrapedItem[] = [];
    const maxTweets: number = cfg.maxTweets || 20;

    for (const query of cfg.queries || []) {
      try {
        const html = await this.tryNitter(`/search?q=${encodeURIComponent(query)}&f=tweets`);
        if (html) items.push(...this.parseTweets(html, { query }).slice(0, maxTweets));
      } catch (err: any) {
        logger.warn(`TwitterAdapter: query failed for "${query}"`, { message: err.message });
      }
    }

    for (const account of cfg.accounts || []) {
      const handle = account.replace('@', '');
      try {
        const html = await this.tryNitter(`/${handle}`);
        if (html) items.push(...this.parseTweets(html, { account: handle }).slice(0, maxTweets));
      } catch (err: any) {
        logger.warn(`TwitterAdapter: account failed for @${handle}`, { message: err.message });
      }
    }

    return items;
  }

  private async tryNitter(path: string): Promise<string | null> {
    for (const instance of NITTER_INSTANCES) {
      try {
        return await fetchHtml(`${instance}${path}`);
      } catch {
        continue;
      }
    }
    return null;
  }

  private parseTweets(html: string, meta: Record<string, any>): ScrapedItem[] {
    const $ = cheerio.load(html);
    const items: ScrapedItem[] = [];

    $('.timeline-item').each((_, el) => {
      const text = $(el).find('.tweet-content').text().trim();
      const author = $(el).find('.username').first().text().trim().replace('@', '');
      const dateStr = $(el).find('.tweet-date a').attr('title') || '';
      const link = $(el).find('.tweet-date a').attr('href') || '';

      if (!text) return;

      items.push({
        id: uuidv4(),
        sourceType: 'twitter',
        url: link ? `https://twitter.com${link}` : '',
        title: text.slice(0, 100),
        rawContent: text,
        snippet: text.slice(0, 300),
        author,
        publishedAt: dateStr ? new Date(dateStr) : undefined,
        metadata: { ...meta },
        scrapedAt: new Date(),
      });
    });

    return items;
  }
}
