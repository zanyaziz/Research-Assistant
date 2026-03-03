import { TopicModel } from '../src/db/models/Topic';
import { ResearchRunModel } from '../src/db/models/ResearchRun';
import { runResearchPipeline } from '../src/pipeline/ResearchPipeline';
import { registry } from '../src/adapters/AdapterRegistry';
import { SerperAdapter } from '../src/adapters/serper/SerperAdapter';
import { WebScraperAdapter } from '../src/adapters/web/WebScraperAdapter';
import { RedditAdapter } from '../src/adapters/reddit/RedditAdapter';
import { TwitterAdapter } from '../src/adapters/twitter/TwitterAdapter';

registry.register(new SerperAdapter());
registry.register(new WebScraperAdapter());
registry.register(new RedditAdapter());
registry.register(new TwitterAdapter());

async function main() {
  const topicId = process.argv[2];
  if (!topicId) {
    const topics = await TopicModel.findAll();
    if (topics.length === 0) {
      console.error('No topics found. Run npm run seed first.');
      process.exit(1);
    }
    console.log('Available topics:');
    topics.forEach((t) => console.log(`  ${t.id}  ${t.name}`));
    process.exit(0);
  }

  const topic = await TopicModel.findById(topicId);
  if (!topic) {
    console.error(`Topic ${topicId} not found`);
    process.exit(1);
  }

  console.log(`Running pipeline for: ${topic.name}`);
  const run = await ResearchRunModel.create(topic.id);
  const briefId = await runResearchPipeline(topic, run.id);
  console.log(`Done. Brief ID: ${briefId}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
