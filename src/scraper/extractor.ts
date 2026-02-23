import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ExtractedContent {
  title: string;
  text: string;
  excerpt?: string;
}

export function extractWithReadability(html: string, url: string): ExtractedContent {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  return {
    title: article?.title || '',
    text: article?.textContent?.trim() || extractWithCheerio(html).text,
    excerpt: article?.excerpt ?? undefined,
  };
}

export function extractWithCheerio(html: string): ExtractedContent {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, aside, .ad, #ad').remove();

  const title = $('title').first().text().trim() || $('h1').first().text().trim();
  const text = $('body').text().replace(/\s+/g, ' ').trim();

  return { title, text };
}

export function htmlToText(html: string, url?: string): ExtractedContent {
  try {
    return extractWithReadability(html, url || 'http://localhost');
  } catch {
    return extractWithCheerio(html);
  }
}
