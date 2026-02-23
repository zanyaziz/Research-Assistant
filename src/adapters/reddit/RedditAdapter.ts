import { v4 as uuidv4 } from 'uuid';
import type { SourceAdapter, ScrapedItem } from '../SourceAdapter';
import { fetchJson } from '../../scraper/fetcher';
import { logger } from '../../utils/logger';

export class RedditAdapter implements SourceAdapter {
  name = 'reddit';
  description = 'Fetch posts from Reddit subreddits using the public JSON API (no auth needed)';

  configSchema = {
    type: 'object',
    properties: {
      subreddits: {
        type: 'array',
        items: { type: 'string' },
        description: 'Subreddit names to fetch (without r/ prefix)',
      },
      sort: { type: 'string', enum: ['new', 'hot', 'top', 'rising'], default: 'new' },
      maxPosts: { type: 'number', default: 20 },
    },
    required: ['subreddits'],
  };

  async fetch(cfg: Record<string, any>): Promise<ScrapedItem[]> {
    const subreddits: string[] = cfg.subreddits || [];
    const sort: string = cfg.sort || 'new';
    const maxPosts: number = cfg.maxPosts || 20;
    const items: ScrapedItem[] = [];

    for (const subreddit of subreddits) {
      try {
        const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${maxPosts}`;
        const data = await fetchJson<any>(url, {
          headers: { 'User-Agent': 'ResearchAssistant/1.0' },
        });

        const posts = data?.data?.children || [];
        for (const post of posts) {
          const p = post.data;
          items.push({
            id: `reddit-${p.id}`,
            sourceType: 'reddit',
            url: `https://www.reddit.com${p.permalink}`,
            title: p.title,
            rawContent: p.selftext || p.title,
            snippet: p.selftext?.slice(0, 300) || p.title,
            author: p.author,
            publishedAt: new Date(p.created_utc * 1000),
            metadata: {
              subreddit: p.subreddit,
              score: p.score,
              numComments: p.num_comments,
              url: p.url,
              flair: p.link_flair_text,
            },
            scrapedAt: new Date(),
          });
        }
      } catch (err: any) {
        logger.error(`RedditAdapter: failed for r/${subreddit}`, { message: err.message });
      }
    }

    return items;
  }
}
