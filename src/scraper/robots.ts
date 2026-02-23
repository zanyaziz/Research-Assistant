import robotsParser from 'robots-parser';
import { fetchHtml } from './fetcher';
import { config } from '../config';
import { getDomain } from '../utils/rateLimiter';

const robotsCache = new Map<string, ReturnType<typeof robotsParser>>();

export async function isAllowed(url: string): Promise<boolean> {
  try {
    const domain = getDomain(url);
    const robotsUrl = `https://${domain}/robots.txt`;

    if (!robotsCache.has(domain)) {
      try {
        const txt = await fetchHtml(robotsUrl, { useRateLimit: false });
        robotsCache.set(domain, robotsParser(robotsUrl, txt));
      } catch {
        // If robots.txt is unreachable, assume allowed
        return true;
      }
    }

    const robots = robotsCache.get(domain)!;
    return robots.isAllowed(url, config.scraping.userAgent) !== false;
  } catch {
    return true;
  }
}
