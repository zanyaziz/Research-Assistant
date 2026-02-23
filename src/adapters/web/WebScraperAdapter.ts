import { v4 as uuidv4 } from 'uuid';
import type { SourceAdapter, ScrapedItem } from '../SourceAdapter';
import { fetchHtml } from '../../scraper/fetcher';
import { htmlToText } from '../../scraper/extractor';
import { isAllowed } from '../../scraper/robots';
import { logger } from '../../utils/logger';

export class WebScraperAdapter implements SourceAdapter {
  name = 'web';
  description = 'Scrape arbitrary URLs using Cheerio and Mozilla Readability';

  configSchema = {
    type: 'object',
    properties: {
      urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of URLs to scrape',
      },
      respectRobots: { type: 'boolean', default: true },
    },
    required: ['urls'],
  };

  async fetch(cfg: Record<string, any>): Promise<ScrapedItem[]> {
    const urls: string[] = cfg.urls || [];
    const respectRobots: boolean = cfg.respectRobots !== false;
    const items: ScrapedItem[] = [];

    for (const url of urls) {
      try {
        if (respectRobots && !(await isAllowed(url))) {
          logger.info(`WebScraperAdapter: skipping ${url} (robots.txt disallows)`);
          continue;
        }

        const html = await fetchHtml(url);
        const { title, text, excerpt } = htmlToText(html, url);

        items.push({
          id: uuidv4(),
          sourceType: 'web',
          url,
          title,
          rawContent: text.slice(0, 10000),
          snippet: excerpt,
          metadata: {},
          scrapedAt: new Date(),
        });
      } catch (err: any) {
        logger.error(`WebScraperAdapter: failed for ${url}`, { message: err.message });
      }
    }

    return items;
  }
}
