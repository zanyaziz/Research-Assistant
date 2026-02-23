import { config } from '../config';
import { logger } from '../utils/logger';

export async function fetchWithPuppeteer(url: string): Promise<string> {
  let puppeteer: any;
  try {
    puppeteer = await import('puppeteer');
  } catch {
    throw new Error('puppeteer is not installed. Run: npm install puppeteer');
  }

  const browser = await puppeteer.default.launch({
    headless: config.scraping.puppeteerHeadless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(config.scraping.userAgent);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    return html;
  } finally {
    await browser.close();
  }
}
