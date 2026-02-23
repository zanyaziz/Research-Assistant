import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import type { SourceAdapter, ScrapedItem } from '../SourceAdapter';
import { fetchWithPuppeteer } from '../../scraper/puppeteer';
import { logger } from '../../utils/logger';

// NOTE: Zillow uses JS rendering — requires Puppeteer.
export class ZillowAdapter implements SourceAdapter {
  name = 'zillow';
  description = 'Search Zillow for residential real estate listings (requires Puppeteer)';

  configSchema = {
    type: 'object',
    properties: {
      locations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Zip codes or city names to search',
      },
      priceMin: { type: 'number' },
      priceMax: { type: 'number' },
      propertyType: {
        type: 'string',
        enum: ['house', 'condo', 'townhouse', 'multi-family', 'land'],
      },
      maxListings: { type: 'number', default: 20 },
    },
    required: ['locations'],
  };

  async fetch(cfg: Record<string, any>): Promise<ScrapedItem[]> {
    const items: ScrapedItem[] = [];

    for (const location of cfg.locations || []) {
      try {
        const url = this.buildSearchUrl(location, cfg);
        const html = await fetchWithPuppeteer(url);
        const listings = this.parseListings(html);

        for (const listing of listings.slice(0, cfg.maxListings || 20)) {
          items.push({
            id: `zillow-${listing.zpid || uuidv4()}`,
            sourceType: 'zillow',
            url: listing.url || url,
            title: listing.address || location,
            rawContent: listing.description || JSON.stringify(listing),
            metadata: {
              price: listing.price,
              beds: listing.beds,
              baths: listing.baths,
              sqft: listing.sqft,
              yearBuilt: listing.yearBuilt,
              zpid: listing.zpid,
            },
            scrapedAt: new Date(),
          });
        }
      } catch (err: any) {
        logger.error(`ZillowAdapter: failed for location "${location}"`, { message: err.message });
      }
    }

    return items;
  }

  private buildSearchUrl(location: string, cfg: any): string {
    const encoded = encodeURIComponent(location);
    return `https://www.zillow.com/homes/${encoded}_rb/`;
  }

  private parseListings(html: string): any[] {
    const $ = cheerio.load(html);
    const listings: any[] = [];

    $('[data-test="property-card"]').each((_, el) => {
      const address = $(el).find('[data-test="property-card-addr"]').text().trim();
      const price = $(el).find('[data-test="property-card-price"]').text().trim();
      const details = $(el).find('[data-test="property-card-details"]').text().trim();
      const link = $(el).find('a').first().attr('href') || '';

      listings.push({
        address,
        price,
        description: `${address} — ${price} — ${details}`,
        url: link.startsWith('http') ? link : `https://www.zillow.com${link}`,
      });
    });

    return listings;
  }
}
