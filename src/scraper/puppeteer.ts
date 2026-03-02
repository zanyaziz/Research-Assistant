import { config } from '../config';
import { logger } from '../utils/logger';

// Singleton browser — reused across all fetchWithPuppeteer calls to avoid
// spawning a new 200MB+ Chromium process for every URL.
let browserPromise: Promise<any> | null = null;

async function getBrowser(): Promise<any> {
  if (!browserPromise) {
    let puppeteer: any;
    try {
      puppeteer = await import('puppeteer');
    } catch {
      throw new Error('puppeteer is not installed. Run: npm install puppeteer');
    }
    logger.info('puppeteer: launching shared browser instance');
    const p = puppeteer.default.launch({
      headless: config.scraping.puppeteerHeadless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    p.then((b: any) => {
      b.on('disconnected', () => {
        logger.warn('puppeteer: browser disconnected — will relaunch on next request');
        browserPromise = null;
      });
    });
    browserPromise = p;
  }
  return browserPromise;
}

export async function fetchWithPuppeteer(url: string): Promise<string> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(config.scraping.userAgent);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    return html;
  } finally {
    await page.close();
  }
}
