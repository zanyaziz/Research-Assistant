# Research Assistant — Project Specification & Prompt

## 1. Project Overview

Build a **self-hosted Research Assistant** powered by LangChain.js and Node.js with a web UI. The system autonomously researches configured topics on a nightly schedule, scrapes web sources, synthesizes findings using an LLM, and presents daily briefs and a searchable archive of all past research.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Web UI (React)                     │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Dashboard  │  │ Topic Config │  │ Research Archive │ │
│  │ Daily Brief │  │    Editor    │  │  Directory/Search│ │
│  └────────────┘  └──────────────┘  └─────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API
┌──────────────────────────┴──────────────────────────────┐
│                  Node.js Backend (Express)               │
│  ┌──────────────────────────────────────────────────┐   │
│  │              LangChain.js Orchestrator            │   │
│  │  ┌────────┐  ┌──────────┐  ┌──────────────────┐ │   │
│  │  │ Chains │  │  Agents  │  │ Output Parsers   │ │   │
│  │  └────────┘  └──────────┘  └──────────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Source Adapter Registry                │   │
│  │  ┌────────┐ ┌───────┐ ┌────────┐ ┌───────────┐  │   │
│  │  │ Google │ │Twitter│ │ Reddit │ │ Custom... │  │   │
│  │  └────────┘ └───────┘ └────────┘ └───────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Scraper Engine                       │   │
│  │  Puppeteer / Cheerio — local HTML extraction     │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Scheduler (node-cron)                    │   │
│  │  Nightly research runs + brief generation        │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │   SQLite / PostgreSQL   │
              │   + Vector Store        │
              │   (ChromaDB / pgvector) │
              └─────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| LLM Framework | LangChain.js (`langchain`, `@langchain/core`, `@langchain/openai` or `@langchain/community`) |
| LLM Provider | OpenAI (default), swappable to Anthropic / Ollama / any LangChain-supported provider |
| Web Framework | Express.js (API) |
| Frontend | React + Vite + Tailwind CSS |
| Scraping | Cheerio (static HTML), Puppeteer (JS-rendered pages) |
| Search | Google Custom Search JSON API (free tier: 100 queries/day) |
| Scheduler | `node-cron` |
| Database | SQLite (dev) / PostgreSQL (prod) via Knex.js or Drizzle ORM |
| Vector Store | ChromaDB (local) or pgvector |
| Queue (optional) | BullMQ + Redis for parallel scrape jobs |

---

## 4. Core Features

### 4.1 Topic Configuration System

Each **Research Topic** is a JSON/YAML config object stored in the database and editable via the UI:

```jsonc
{
  "id": "uuid",
  "name": "AI Startup Funding",
  "enabled": true,
  "schedule": "0 2 * * *",           // cron — run at 2 AM daily
  "sources": ["google", "twitter", "reddit"],  // which adapters to use
  "sourceConfig": {
    "google": {
      "queries": [
        "AI startup funding 2025",
        "series A artificial intelligence"
      ],
      "maxResults": 10,
      "dateRestrict": "d1"            // last 24 hours
    },
    "twitter": {
      "queries": ["AI startup funding"],
      "accounts": ["@techcrunch", "@pitchbook"],
      "maxTweets": 50
    },
    "reddit": {
      "subreddits": ["artificial", "startups", "venturecapital"],
      "sort": "new",
      "maxPosts": 20
    }
  },
  "qualityCriteria": {
    "goodOutput": [
      "Contains specific dollar amounts and company names",
      "Cites primary sources (SEC filings, press releases)",
      "Identifies trends across multiple data points",
      "Includes investor names and fund details"
    ],
    "badOutput": [
      "Vague summaries with no specific data",
      "Rehashed press release language with no analysis",
      "Outdated information presented as new",
      "Speculation without evidence"
    ],
    "outputFormat": "structured_brief",  // or "raw_notes", "executive_summary", "deep_dive"
    "maxLength": 2000,
    "tone": "analytical and data-driven"
  },
  "tags": ["AI", "funding", "startups"]
}
```

### 4.2 Source Adapter System (Plugin Architecture)

Every source implements a common `SourceAdapter` interface making the system trivially extensible:

```typescript
// src/adapters/SourceAdapter.ts

export interface ScrapedItem {
  id: string;
  sourceType: string;          // "google", "twitter", "reddit", "zillow", etc.
  url: string;
  title: string;
  rawContent: string;          // full scraped text / HTML-to-text
  snippet?: string;
  author?: string;
  publishedAt?: Date;
  metadata: Record<string, any>; // source-specific fields (price, beds, etc.)
  scrapedAt: Date;
}

export interface SourceAdapter {
  /** Unique name for this adapter */
  name: string;

  /** Human-readable description shown in the UI */
  description: string;

  /** JSON schema describing the sourceConfig this adapter expects */
  configSchema: object;

  /**
   * Execute the search/scrape for the given topic config.
   * Returns an array of raw scraped items.
   */
  fetch(config: Record<string, any>): Promise<ScrapedItem[]>;
}
```

**Built-in adapters to implement:**

| Adapter | Description | Free API / Method |
|---|---|---|
| `GoogleSearchAdapter` | Google Custom Search JSON API | 100 free queries/day via Programmable Search Engine |
| `WebScraperAdapter` | Generic URL scraper | Cheerio for static, Puppeteer for JS-rendered |
| `TwitterAdapter` | X/Twitter scraping | Nitter instances, or unofficial API via `rettiwt-api` or `agent-twitter-client` |
| `RedditAdapter` | Reddit posts + comments | Reddit JSON API (append `.json` to any URL — no auth needed for public data) |

**Example custom adapters to scaffold (empty implementations):**

| Adapter | Use Case |
|---|---|
| `ZillowAdapter` | Residential real estate listings |
| `LoopNetAdapter` | Commercial real estate properties |
| `BizBuySellAdapter` | Businesses for sale |

### 4.3 Scraping Engine

```
URL → Fetch HTML (axios/puppeteer) → Extract text (cheerio/readability) → Clean → Store
```

- Use **Mozilla Readability** (`@mozilla/readability` + `jsdom`) for article extraction — same algorithm as Firefox Reader View
- Use **Cheerio** for structured data extraction (prices, tables, listings)
- Use **Puppeteer** only when JS rendering is required (detected automatically or flagged per-adapter)
- Respect `robots.txt` — use `robots-parser` package
- Rate limiting per domain — configurable delays between requests
- User-Agent rotation from a configurable list
- Proxy support (optional, configurable per adapter)
- Store raw HTML + extracted text in the database for reprocessing

### 4.4 LangChain Research Pipeline

The research pipeline is a LangChain **SequentialChain** with these steps:

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  1. Gather   │───▶│  2. Filter   │───▶│  3. Analyze   │───▶│ 4. Synthesize│
│  (Adapters)  │    │  & Dedupe    │    │  (per-source) │    │  (Brief)     │
└─────────────┘    └──────────────┘    └───────────────┘    └──────────────┘
```

**Step 1 — Gather:** Run all configured source adapters in parallel. Collect `ScrapedItem[]`.

**Step 2 — Filter & Deduplicate:**
- Embedding-based deduplication using the vector store (cosine similarity > 0.92 = duplicate)
- Relevance scoring: embed the topic description and queries, rank scraped items by similarity
- Drop items below a configurable relevance threshold

**Step 3 — Analyze (per source):**
- Use a LangChain `MapReduceDocumentsChain` or `RefineDocumentsChain`
- Each scraped item is summarized and evaluated against the topic's `qualityCriteria`
- Extract key entities, facts, figures, quotes
- LLM prompt includes the `goodOutput` / `badOutput` criteria as few-shot guidance

**Step 4 — Synthesize (Daily Brief):**
- Combine all per-source analyses into a single coherent brief
- Apply the topic's `outputFormat`, `tone`, and `maxLength`
- Generate a structured output with: headline, key findings, source citations, confidence level, follow-up questions
- Store the brief in the database linked to the topic and date

**LangChain prompt template for synthesis:**

```
You are a research analyst producing a daily brief on the topic: "{topicName}".

## Quality Guidelines
GOOD output characteristics:
{goodOutputCriteria}

BAD output characteristics (avoid these):
{badOutputCriteria}

## Source Material
{analyzedSources}

## Instructions
Synthesize the above source material into a {outputFormat} of no more than {maxLength} words.
Tone: {tone}

Your brief MUST include:
1. **Headline** — single sentence capturing the most important finding
2. **Key Findings** — 3-5 bullet points with specific facts and figures
3. **Analysis** — 2-3 paragraphs connecting the findings to broader trends
4. **Sources** — numbered list of URLs used
5. **Confidence** — rate your confidence in the findings: HIGH / MEDIUM / LOW
6. **Follow-up Questions** — 2-3 questions worth investigating next

Output as structured JSON matching this schema: {outputSchema}
```

### 4.5 Nightly Scheduler

- `node-cron` processes each topic's cron schedule
- On trigger: run the full research pipeline for that topic
- Generate a **Daily Digest** combining all topic briefs from that night's run
- Store results and update the archive
- Optional: send digest via email (nodemailer) or webhook (Slack, Discord)

### 4.6 Web UI

#### Pages:

**Dashboard / Daily Brief**
- Today's digest front and center — all topic briefs from last night's run
- Timeline view of previous days (click to expand)
- Status indicators: which topics ran, succeeded, failed
- Quick stats: sources scraped, items processed, briefs generated

**Research Archive / Directory**
- Searchable, filterable list of all past research briefs
- Filter by: topic, date range, tags, confidence level
- Full-text search across all briefs
- Click into any brief to see: the synthesized output, all source items that fed into it, the raw scraped content, LLM analysis chain logs

**Topic Configuration**
- List all topics with enable/disable toggles
- Create / edit topic with a form:
  - Name, description, tags
  - Schedule (cron builder UI)
  - Source selection (checkboxes for available adapters)
  - Per-source config (dynamic form generated from adapter's `configSchema`)
  - Quality criteria editor (good output, bad output, format, tone, length)
- "Run Now" button to trigger an immediate research run
- Test mode: run pipeline on a single source and preview results before saving

**Source Adapters**
- List installed adapters with status
- Documentation / config schema for each
- Link to add custom adapters

**Settings**
- LLM provider configuration (API keys, model selection, temperature)
- Scraping settings (rate limits, proxy, user agents)
- Notification settings (email, webhook)
- Database / storage settings

---

## 5. Database Schema

```sql
-- Topics
CREATE TABLE topics (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  enabled       BOOLEAN DEFAULT true,
  schedule      TEXT NOT NULL,           -- cron expression
  sources       JSON NOT NULL,           -- ["google", "reddit"]
  source_config JSON NOT NULL,           -- per-source configuration
  quality_criteria JSON NOT NULL,        -- good/bad output, format, tone
  tags          JSON DEFAULT '[]',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Research Runs
CREATE TABLE research_runs (
  id            TEXT PRIMARY KEY,
  topic_id      TEXT REFERENCES topics(id),
  status        TEXT NOT NULL,           -- "pending", "running", "completed", "failed"
  started_at    DATETIME,
  completed_at  DATETIME,
  stats         JSON,                    -- { sources_queried, items_scraped, items_relevant }
  error         TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scraped Items
CREATE TABLE scraped_items (
  id            TEXT PRIMARY KEY,
  run_id        TEXT REFERENCES research_runs(id),
  source_type   TEXT NOT NULL,
  url           TEXT NOT NULL,
  title         TEXT,
  raw_content   TEXT,
  snippet       TEXT,
  author        TEXT,
  published_at  DATETIME,
  metadata      JSON,
  relevance_score REAL,
  scraped_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Research Briefs (the final output)
CREATE TABLE briefs (
  id            TEXT PRIMARY KEY,
  run_id        TEXT REFERENCES research_runs(id),
  topic_id      TEXT REFERENCES topics(id),
  headline      TEXT,
  content       JSON NOT NULL,           -- structured brief content
  confidence    TEXT,                    -- HIGH / MEDIUM / LOW
  brief_date    DATE NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily Digests (combines all topic briefs for a date)
CREATE TABLE daily_digests (
  id            TEXT PRIMARY KEY,
  digest_date   DATE UNIQUE NOT NULL,
  summary       TEXT,
  topic_briefs  JSON NOT NULL,           -- array of brief IDs
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Project Structure

```
research-assistant/
├── package.json
├── tsconfig.json
├── .env.example                    # API keys, DB config
├── knexfile.ts                     # database migrations config
│
├── src/
│   ├── index.ts                    # Express app entry point
│   ├── config.ts                   # env + defaults
│   │
│   ├── api/                        # REST API routes
│   │   ├── topics.routes.ts
│   │   ├── briefs.routes.ts
│   │   ├── runs.routes.ts
│   │   ├── adapters.routes.ts
│   │   └── settings.routes.ts
│   │
│   ├── adapters/                   # Source adapter plugins
│   │   ├── SourceAdapter.ts        # interface definition
│   │   ├── AdapterRegistry.ts      # register + discover adapters
│   │   ├── google/
│   │   │   └── GoogleSearchAdapter.ts
│   │   ├── web/
│   │   │   └── WebScraperAdapter.ts
│   │   ├── twitter/
│   │   │   └── TwitterAdapter.ts
│   │   ├── reddit/
│   │   │   └── RedditAdapter.ts
│   │   ├── zillow/                 # example custom adapter (scaffold)
│   │   │   └── ZillowAdapter.ts
│   │   ├── loopnet/                # example custom adapter (scaffold)
│   │   │   └── LoopNetAdapter.ts
│   │   └── bizbuysell/             # example custom adapter (scaffold)
│   │       └── BizBuySellAdapter.ts
│   │
│   ├── scraper/                    # Low-level scraping utilities
│   │   ├── fetcher.ts              # HTTP fetching with retry + rate limit
│   │   ├── extractor.ts            # HTML → text via Readability / Cheerio
│   │   ├── puppeteer.ts            # JS-rendered page scraping
│   │   └── robots.ts               # robots.txt compliance
│   │
│   ├── pipeline/                   # LangChain research pipeline
│   │   ├── ResearchPipeline.ts     # orchestrates the full pipeline
│   │   ├── chains/
│   │   │   ├── filterChain.ts      # deduplicate + relevance filter
│   │   │   ├── analyzeChain.ts     # per-source analysis
│   │   │   └── synthesizeChain.ts  # final brief generation
│   │   ├── prompts/
│   │   │   ├── analyze.prompt.ts
│   │   │   └── synthesize.prompt.ts
│   │   └── outputSchemas.ts        # Zod schemas for structured output
│   │
│   ├── scheduler/
│   │   └── CronScheduler.ts        # manages nightly runs
│   │
│   ├── vectorstore/
│   │   └── store.ts                # ChromaDB / pgvector integration
│   │
│   ├── db/
│   │   ├── connection.ts
│   │   ├── migrations/
│   │   └── models/                 # data access layer
│   │       ├── Topic.ts
│   │       ├── ResearchRun.ts
│   │       ├── ScrapedItem.ts
│   │       ├── Brief.ts
│   │       └── DailyDigest.ts
│   │
│   └── utils/
│       ├── logger.ts               # winston or pino
│       ├── rateLimiter.ts
│       └── notifications.ts        # email / webhook dispatch
│
├── web/                            # React frontend (Vite)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx       # daily brief + timeline
│       │   ├── Archive.tsx         # research directory + search
│       │   ├── TopicEditor.tsx     # create / edit topic configs
│       │   ├── TopicList.tsx       # all topics with toggles
│       │   ├── BriefDetail.tsx     # single brief deep-dive
│       │   ├── Adapters.tsx        # installed source adapters
│       │   └── Settings.tsx        # global settings
│       ├── components/
│       │   ├── BriefCard.tsx
│       │   ├── TopicForm.tsx
│       │   ├── SourceConfigForm.tsx
│       │   ├── QualityCriteriaEditor.tsx
│       │   ├── CronScheduleBuilder.tsx
│       │   ├── SearchBar.tsx
│       │   └── StatusBadge.tsx
│       ├── hooks/
│       │   └── useApi.ts
│       └── lib/
│           └── api.ts              # axios client
│
├── migrations/                     # Knex migration files
│   └── 001_initial_schema.ts
│
└── scripts/
    ├── seed-topics.ts              # seed example topic configs
    └── run-now.ts                  # CLI to trigger a research run
```

---

## 7. API Endpoints

```
# Topics
GET    /api/topics                  — list all topics
POST   /api/topics                  — create topic
GET    /api/topics/:id              — get topic detail
PUT    /api/topics/:id              — update topic
DELETE /api/topics/:id              — delete topic
POST   /api/topics/:id/run          — trigger immediate run
POST   /api/topics/:id/test         — test run (single source, no save)

# Briefs
GET    /api/briefs                  — list briefs (filterable by topic, date, tags)
GET    /api/briefs/:id              — get brief with full detail + sources
GET    /api/briefs/today            — today's briefs

# Daily Digests
GET    /api/digests                 — list digests
GET    /api/digests/latest          — most recent digest
GET    /api/digests/:date           — digest for specific date

# Research Runs
GET    /api/runs                    — list runs (filterable)
GET    /api/runs/:id                — run detail with scraped items

# Adapters
GET    /api/adapters                — list registered adapters + schemas

# Settings
GET    /api/settings                — get current settings
PUT    /api/settings                — update settings

# Search
GET    /api/search?q=...            — full-text search across all briefs
```

---

## 8. Adding a New Source Adapter

To add a new source (e.g., Zillow), create a single file:

```typescript
// src/adapters/zillow/ZillowAdapter.ts

import { SourceAdapter, ScrapedItem } from '../SourceAdapter';
import { scrapeWithCheerio } from '../../scraper/extractor';

export class ZillowAdapter implements SourceAdapter {
  name = 'zillow';
  description = 'Search Zillow for residential real estate listings';

  configSchema = {
    type: 'object',
    properties: {
      locations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Zip codes or city names to search'
      },
      priceMin: { type: 'number' },
      priceMax: { type: 'number' },
      propertyType: {
        type: 'string',
        enum: ['house', 'condo', 'townhouse', 'multi-family', 'land']
      },
      maxListings: { type: 'number', default: 20 }
    },
    required: ['locations']
  };

  async fetch(config: Record<string, any>): Promise<ScrapedItem[]> {
    const items: ScrapedItem[] = [];

    for (const location of config.locations) {
      const url = this.buildSearchUrl(location, config);
      const html = await fetchWithPuppeteer(url); // Zillow needs JS rendering
      const listings = this.parseListings(html);

      for (const listing of listings.slice(0, config.maxListings || 20)) {
        items.push({
          id: `zillow-${listing.zpid}`,
          sourceType: 'zillow',
          url: listing.url,
          title: listing.address,
          rawContent: listing.description,
          metadata: {
            price: listing.price,
            beds: listing.beds,
            baths: listing.baths,
            sqft: listing.sqft,
            yearBuilt: listing.yearBuilt,
            zpid: listing.zpid
          },
          scrapedAt: new Date()
        });
      }
    }

    return items;
  }

  private buildSearchUrl(location: string, config: any): string {
    // Build Zillow search URL with filters
  }

  private parseListings(html: string): any[] {
    // Extract listing data from HTML using Cheerio
  }
}
```

Then register it:

```typescript
// src/adapters/AdapterRegistry.ts
import { ZillowAdapter } from './zillow/ZillowAdapter';

registry.register(new ZillowAdapter());
```

That's it. The UI automatically picks up the new adapter's `configSchema` and renders the configuration form.

---

## 9. Environment Variables

```bash
# .env.example

# LLM
LLM_PROVIDER=openai                     # openai | anthropic | ollama
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=gpt-4o-mini                   # or claude-sonnet-4-20250514, llama3, etc.
LLM_TEMPERATURE=0.3

# Google Custom Search (free: 100 queries/day)
GOOGLE_CSE_API_KEY=...
GOOGLE_CSE_ENGINE_ID=...

# Database
DATABASE_URL=sqlite://./data/research.db  # or postgresql://...

# Vector Store
VECTOR_STORE=chroma                       # chroma | pgvector
CHROMA_URL=http://localhost:8000

# Scraping
SCRAPE_RATE_LIMIT_MS=2000                # delay between requests to same domain
SCRAPE_USER_AGENT=ResearchAssistant/1.0
PUPPETEER_HEADLESS=true

# Notifications (optional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
NOTIFY_EMAIL=
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=

# Server
PORT=3000
NODE_ENV=development
```

---

## 10. Key Implementation Notes

### Google Custom Search (Free)
- Create a Programmable Search Engine at https://programmablesearchengine.google.com
- Enable "Search the entire web"
- Get API key from Google Cloud Console (Custom Search JSON API)
- Free tier: **100 queries/day** — plan query budget across topics accordingly
- Endpoint: `GET https://www.googleapis.com/customsearch/v1?key={KEY}&cx={ENGINE_ID}&q={query}`

### Twitter/X Scraping
- Official API free tier is extremely limited (read-only, 1 app)
- Alternatives: scrape via Nitter public instances, use `rettiwt-api` npm package, or `agent-twitter-client`
- Respect rate limits; cache aggressively
- Consider storing tweet text + metadata, not the HTML

### Reddit (No Auth Needed)
- Append `.json` to any Reddit URL: `https://www.reddit.com/r/startups/new.json`
- Respect `Retry-After` headers
- Rate limit: keep requests under 60/minute with a descriptive User-Agent

### LangChain.js Specifics
- Use `ChatPromptTemplate` for all prompts (supports message-based APIs)
- Use `StructuredOutputParser` with Zod schemas for reliable JSON extraction
- Use `RunnableSequence` for pipeline composition
- Use `RecursiveCharacterTextSplitter` for long scraped documents
- Leverage `Document` class to pass metadata through the chain
- Use `RunnablePassthrough` and `RunnableParallel` for multi-source parallel processing

### Extensibility Checklist for New Adapters
1. Create a class implementing `SourceAdapter`
2. Define `configSchema` (JSON Schema) — UI auto-generates the config form from this
3. Implement `fetch()` — returns `ScrapedItem[]`
4. Register in `AdapterRegistry`
5. No other changes needed — the pipeline, storage, and UI all work generically

---

## 11. Development Roadmap

### Phase 1 — Foundation (Week 1-2)
- [ ] Project scaffolding (Node.js + TypeScript + Express + Vite React)
- [ ] Database schema + migrations
- [ ] `SourceAdapter` interface + `AdapterRegistry`
- [ ] `GoogleSearchAdapter` + `WebScraperAdapter` (Cheerio + Readability)
- [ ] Basic scraping engine with rate limiting
- [ ] Minimal API: topics CRUD, trigger run

### Phase 2 — LangChain Pipeline (Week 2-3)
- [ ] Filter/dedup chain with vector store
- [ ] Per-source analysis chain
- [ ] Synthesis chain with quality criteria
- [ ] Brief generation and storage
- [ ] Pipeline orchestration (`ResearchPipeline.ts`)

### Phase 3 — Scheduling + Core UI (Week 3-4)
- [ ] `node-cron` scheduler for nightly runs
- [ ] Daily digest generation
- [ ] Dashboard page (daily brief view)
- [ ] Topic config editor with dynamic source forms
- [ ] Research archive with search and filters

### Phase 4 — Social Sources (Week 4-5)
- [ ] `TwitterAdapter`
- [ ] `RedditAdapter`
- [ ] UI for social source configuration

### Phase 5 — Polish + Custom Adapters (Week 5-6)
- [ ] Scaffold `ZillowAdapter`, `LoopNetAdapter`, `BizBuySellAdapter`
- [ ] Notification system (email / Slack / Discord)
- [ ] Error handling, retry logic, monitoring
- [ ] Brief detail page with source drill-down
- [ ] Settings page

### Phase 6 — Advanced (Future)
- [ ] Semantic search across all historical briefs
- [ ] Trend detection across briefs over time
- [ ] Multi-user support with authentication
- [ ] Export briefs (PDF, email newsletter)
- [ ] MCP server integration for Claude Desktop
- [ ] RSS feed output for briefs

---

## 12. Guiding Principles

1. **Adapter-first architecture** — every data source is a plugin. The core never knows about specific sources.
2. **Quality over quantity** — the quality criteria system ensures output meets the user's standards, not just volume.
3. **Full traceability** — every brief links back to the specific scraped items and source URLs that produced it.
4. **Offline-capable scraping** — all HTML is scraped and stored locally; LLM analysis runs on stored content, not live pages.
5. **Graceful degradation** — if a source fails, the brief is still generated from remaining sources with a note about what's missing.
6. **Respect the web** — honor `robots.txt`, rate limit responsibly, use descriptive User-Agents, cache aggressively.
