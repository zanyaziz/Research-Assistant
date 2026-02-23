import type { ScrapedItem } from '../../adapters/SourceAdapter';
import { logger } from '../../utils/logger';

// Deduplicate by URL, then filter low-content items.
// Vector-based dedup is a future enhancement (requires ChromaDB running).
export function deduplicateItems(items: ScrapedItem[]): ScrapedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export function filterRelevantItems(
  items: ScrapedItem[],
  minContentLength = 50
): ScrapedItem[] {
  return items.filter((item) => {
    const content = item.rawContent || '';
    if (content.length < minContentLength) {
      logger.debug(`filterChain: dropping low-content item ${item.url}`);
      return false;
    }
    return true;
  });
}

export function filterAndDedup(items: ScrapedItem[]): ScrapedItem[] {
  const deduped = deduplicateItems(items);
  const filtered = filterRelevantItems(deduped);
  logger.info(`filterChain: ${items.length} → ${deduped.length} deduped → ${filtered.length} after filter`);
  return filtered;
}
