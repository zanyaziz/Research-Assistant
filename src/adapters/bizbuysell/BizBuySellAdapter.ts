import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import type { SourceAdapter, ScrapedItem } from '../SourceAdapter';
import { fetchHtml } from '../../scraper/fetcher';
import { logger } from '../../utils/logger';

// Scaffold: BizBuySell businesses-for-sale listings.
export class BizBuySellAdapter implements SourceAdapter {
  name = 'bizbuysell';
  description = 'Search BizBuySell for businesses for sale';

  configSchema = {
    type: 'object',
    properties: {
      locations: {
        type: 'array',
        items: { type: 'string' },
        description: 'City or state to search',
      },
      industry: { type: 'string', description: 'Industry keyword filter' },
      priceMax: { type: 'number', description: 'Maximum asking price' },
      maxListings: { type: 'number', default: 20 },
    },
    required: ['locations'],
  };

  async fetch(cfg: Record<string, any>): Promise<ScrapedItem[]> {
    const items: ScrapedItem[] = [];

    for (const location of cfg.locations || []) {
      try {
        const encoded = encodeURIComponent(location.toLowerCase().replace(/\s+/g, '-'));
        const url = `https://www.bizbuysell.com/businesses-for-sale/${encoded}/`;

        const html = await fetchHtml(url);
        const listings = this.parseListings(html);

        for (const listing of listings.slice(0, cfg.maxListings || 20)) {
          items.push({
            id: uuidv4(),
            sourceType: 'bizbuysell',
            url: listing.url,
            title: listing.title,
            rawContent: listing.description,
            metadata: {
              location,
              askingPrice: listing.askingPrice,
              cashFlow: listing.cashFlow,
              revenue: listing.revenue,
            },
            scrapedAt: new Date(),
          });
        }
      } catch (err: any) {
        logger.error(`BizBuySellAdapter: failed for "${location}"`, { message: err.message });
      }
    }

    return items;
  }

  private parseListings(html: string): any[] {
    const $ = cheerio.load(html);
    const listings: any[] = [];

    $('.listing').each((_, el) => {
      const title = $(el).find('.listing-title, h3').first().text().trim();
      const askingPrice = $(el).find('.price, .asking-price').first().text().trim();
      const description = $(el).find('.description, .listing-description').first().text().trim();
      const link = $(el).find('a').first().attr('href') || '';

      if (title) {
        listings.push({
          title,
          askingPrice,
          description: `${title} — ${askingPrice} — ${description}`,
          url: link.startsWith('http') ? link : `https://www.bizbuysell.com${link}`,
        });
      }
    });

    return listings;
  }
}
