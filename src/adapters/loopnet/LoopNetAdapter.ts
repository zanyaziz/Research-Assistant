import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import type { SourceAdapter, ScrapedItem } from '../SourceAdapter';
import { fetchHtml } from '../../scraper/fetcher';
import { logger } from '../../utils/logger';

// Scaffold: LoopNet commercial real estate listings.
export class LoopNetAdapter implements SourceAdapter {
  name = 'loopnet';
  description = 'Search LoopNet for commercial real estate listings';

  configSchema = {
    type: 'object',
    properties: {
      locations: {
        type: 'array',
        items: { type: 'string' },
        description: 'City or zip code to search',
      },
      propertyType: {
        type: 'string',
        enum: ['office', 'retail', 'industrial', 'multifamily', 'land', 'hospitality'],
        default: 'office',
      },
      maxListings: { type: 'number', default: 20 },
    },
    required: ['locations'],
  };

  async fetch(cfg: Record<string, any>): Promise<ScrapedItem[]> {
    const items: ScrapedItem[] = [];

    for (const location of cfg.locations || []) {
      try {
        const propertyType = cfg.propertyType || 'office';
        const encoded = encodeURIComponent(location);
        const url = `https://www.loopnet.com/search/${propertyType}-for-lease/${encoded}/`;

        const html = await fetchHtml(url);
        const listings = this.parseListings(html, url);

        for (const listing of listings.slice(0, cfg.maxListings || 20)) {
          items.push({
            id: uuidv4(),
            sourceType: 'loopnet',
            url: listing.url,
            title: listing.title,
            rawContent: listing.description,
            metadata: { location, propertyType, price: listing.price },
            scrapedAt: new Date(),
          });
        }
      } catch (err: any) {
        logger.error(`LoopNetAdapter: failed for "${location}"`, { message: err.message });
      }
    }

    return items;
  }

  private parseListings(html: string, baseUrl: string): any[] {
    const $ = cheerio.load(html);
    const listings: any[] = [];

    $('.placard').each((_, el) => {
      const title = $(el).find('.placard-title').text().trim();
      const price = $(el).find('.placard-price').text().trim();
      const link = $(el).find('a').first().attr('href') || '';
      const description = $(el).find('.placard-description').text().trim();

      if (title) {
        listings.push({
          title: title || 'Listing',
          price,
          description: `${title} — ${price} — ${description}`,
          url: link.startsWith('http') ? link : `https://www.loopnet.com${link}`,
        });
      }
    });

    return listings;
  }
}
