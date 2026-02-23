import axios, { type AxiosRequestConfig } from 'axios';
import { config } from '../config';
import { rateLimit, getDomain } from '../utils/rateLimiter';
import { logger } from '../utils/logger';

const DEFAULT_TIMEOUT = 15000;
const MAX_RETRIES = 3;

export async function fetchHtml(url: string, options: { useRateLimit?: boolean } = {}): Promise<string> {
  const domain = getDomain(url);
  if (options.useRateLimit !== false) {
    await rateLimit(domain, config.scraping.rateLimitMs);
  }

  const axiosConfig: AxiosRequestConfig = {
    headers: { 'User-Agent': config.scraping.userAgent },
    timeout: DEFAULT_TIMEOUT,
    responseType: 'text',
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, axiosConfig);
      return response.data as string;
    } catch (err: any) {
      const status: number | undefined = err.response?.status;
      logger.warn(`fetchHtml attempt ${attempt} failed for ${url}`, { message: err.message });
      // Don't retry on permanent client errors (4xx except 429 rate-limit)
      if (status && status >= 400 && status < 500 && status !== 429) throw err;
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${MAX_RETRIES} attempts`);
}

export async function fetchJson<T = any>(url: string, options: { headers?: Record<string, string> } = {}): Promise<T> {
  const domain = getDomain(url);
  await rateLimit(domain, config.scraping.rateLimitMs);

  const response = await axios.get<T>(url, {
    headers: {
      'User-Agent': config.scraping.userAgent,
      Accept: 'application/json',
      ...options.headers,
    },
    timeout: DEFAULT_TIMEOUT,
  });
  return response.data;
}
