import { v4 as uuidv4 } from 'uuid';
import type { SourceAdapter, ScrapedItem } from '../SourceAdapter';
import { fetchHtml } from '../../scraper/fetcher';
import { logger } from '../../utils/logger';
import * as cheerio from 'cheerio';

// Uses public Nitter-compatible instances for scraping — no API key required.
// Most original Nitter instances went offline in early 2024 when X removed
// guest account access. xcancel.com is a maintained fork that still works.
// Check https://status.d420.de for an up-to-date list of live instances.
const NITTER_INSTANCES = [
  'https://xcancel.com',
  'https://nitter.poast.org',
  'https://nitter.privacydev.net',
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
        if (html) {
          const parsed = this.parseTweets(html, { query }).slice(0, maxTweets);
          if (parsed.length === 0) {
            logger.warn(`TwitterAdapter: query "${query}" returned HTML but 0 tweets — Nitter HTML structure may have changed`);
          }
          items.push(...parsed);
        }
      } catch (err: any) {
        logger.warn(`TwitterAdapter: query failed for "${query}"`, { message: err.message });
      }
    }

    for (const account of cfg.accounts || []) {
      const handle = account.replace('@', '');
      try {
        const html = await this.tryNitter(`/${handle}`);
        if (html) {
          const parsed = this.parseTweets(html, { account: handle }).slice(0, maxTweets);
          if (parsed.length === 0) {
            logger.warn(`TwitterAdapter: @${handle} returned HTML but 0 tweets — Nitter HTML structure may have changed`);
          }
          items.push(...parsed);
        }
      } catch (err: any) {
        logger.warn(`TwitterAdapter: account failed for @${handle}`, { message: err.message });
      }
    }

    return items;
  }

  private async tryNitter(path: string): Promise<string | null> {
    for (const instance of NITTER_INSTANCES) {
      try {
        const html = await fetchHtml(`${instance}${path}`);
        logger.debug(`TwitterAdapter: got HTML from ${instance}${path}`);
        return html;
      } catch (err: any) {
        logger.warn(`TwitterAdapter: instance ${instance} failed — ${err.message}`);
      }
    }
    logger.warn('TwitterAdapter: all Nitter instances failed — see https://status.d420.de for live instances');
    return null;
  }

  private parseTweets(html: string, meta: Record<string, any>): ScrapedItem[] {
    const $ = cheerio.load(html);
    const items: ScrapedItem[] = [];

    // Check for a known error page (Nitter rate-limit / login-wall)
    const bodyText = $('body').text().toLowerCase();
    if (bodyText.includes('instance is rate-limited') || bodyText.includes('rate limit')) {
      logger.warn('TwitterAdapter: Nitter instance is rate-limited');
      return [];
    }

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
