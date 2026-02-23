export interface ScrapedItem {
  id: string;
  sourceType: string;
  url: string;
  title: string;
  rawContent: string;
  snippet?: string;
  author?: string;
  publishedAt?: Date;
  metadata: Record<string, any>;
  scrapedAt: Date;
}

export interface SourceAdapter {
  name: string;
  description: string;
  configSchema: object;
  fetch(config: Record<string, any>): Promise<ScrapedItem[]>;
}
