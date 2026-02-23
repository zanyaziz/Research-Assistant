import { TopicModel } from '../src/db/models/Topic';
import { logger } from '../src/utils/logger';

const SAMPLE_TOPICS = [
  {
    name: 'AI Startup Funding',
    description: 'Track funding rounds and investments in AI startups',
    enabled: true,
    schedule: '0 2 * * *',
    sources: ['google', 'reddit'],
    source_config: {
      google: {
        queries: ['AI startup funding 2026', 'series A artificial intelligence'],
        maxResults: 10,
        dateRestrict: 'd1',
      },
      reddit: {
        subreddits: ['artificial', 'startups', 'venturecapital'],
        sort: 'new',
        maxPosts: 20,
      },
    },
    quality_criteria: {
      goodOutput: [
        'Contains specific dollar amounts and company names',
        'Cites primary sources (SEC filings, press releases)',
        'Identifies trends across multiple data points',
      ],
      badOutput: [
        'Vague summaries with no specific data',
        'Outdated information presented as new',
      ],
      outputFormat: 'structured_brief',
      maxLength: 2000,
      tone: 'analytical and data-driven',
    },
    tags: ['AI', 'funding', 'startups'],
  },
];

async function seed() {
  for (const topic of SAMPLE_TOPICS) {
    await TopicModel.create(topic);
    logger.info(`Seeded topic: ${topic.name}`);
  }
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
