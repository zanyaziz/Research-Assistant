# Research Assistant

A self-hosted research assistant powered by LangChain.js and Node.js. Autonomously researches configured topics on a nightly schedule, scrapes web sources, synthesizes findings using an LLM, and presents daily briefs in a searchable web UI.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Web UI (React)                     │
│  Dashboard · Archive · Topic Config · Brief Detail      │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API
┌──────────────────────────┴──────────────────────────────┐
│                  Node.js / Express Backend               │
│                                                         │
│  LangChain Pipeline: Gather → Filter → Analyze → Brief  │
│  Source Adapter Registry (plugin architecture)          │
│  Scraper Engine (Cheerio · Readability · Puppeteer)     │
│  node-cron Scheduler (nightly runs + daily digest)      │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │   SQLite (dev)          │
              │   PostgreSQL (prod)     │
              └─────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| LLM Framework | LangChain.js (`langchain`, `@langchain/core`, `@langchain/openai`) |
| LLM Provider | OpenAI (default) — swappable to Anthropic / Ollama |
| Web Framework | Express.js |
| Frontend | React + Vite + Tailwind CSS |
| Scraping | Cheerio (static HTML), Mozilla Readability (articles), Puppeteer (JS-rendered) |
| Search | Serper (Google SERP API — 2,500 free queries) |
| Scheduler | `node-cron` |
| Database | SQLite (dev) / PostgreSQL (prod) via Knex.js |
| Output Validation | Zod |

---

## Features

- **Topic configuration** — define research topics with custom queries, sources, quality criteria, and cron schedules
- **Plugin adapter system** — every data source is a drop-in plugin implementing a single interface
- **LangChain pipeline** — filter/dedup → per-source LLM analysis → structured brief synthesis
- **Nightly scheduler** — `node-cron` triggers each topic on its own schedule; generates a combined daily digest
- **Research archive** — searchable history of all past briefs with source drill-down
- **Webhook notifications** — post daily digest summaries to Slack or Discord
- **robots.txt compliance** — respects `robots.txt`, rate-limits per domain, rotates User-Agent

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd research-assistant
npm install --legacy-peer-deps
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```bash
OPENAI_API_KEY=sk-...           # required for LLM analysis and synthesis
SERPER_API_KEY=...              # required for web search (get free key at serper.dev)
```

### 3. Start the backend

```bash
npm run dev                     # starts on http://localhost:3000
                                # runs DB migrations automatically on boot
```

### 4. Start the frontend

```bash
cd web
npm install
npm run dev                     # starts on http://localhost:5173
                                # /api requests proxy to localhost:3000
```

### 5. Seed example topics (optional)

```bash
npm run seed                    # adds an "AI Startup Funding" example topic
```

### 6. Trigger a run manually

```bash
npm run run-now                 # lists available topic IDs
npm run run-now <topic-id>      # runs the full pipeline for that topic
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | OpenAI API key (required) |
| `ANTHROPIC_API_KEY` | — | Anthropic API key (if using Anthropic provider) |
| `LLM_PROVIDER` | `openai` | `openai` \| `anthropic` \| `ollama` |
| `LLM_MODEL` | `gpt-4o-mini` | Model name for the configured provider |
| `LLM_TEMPERATURE` | `0.3` | LLM temperature |
| `SERPER_API_KEY` | — | Serper API key — get free key at [serper.dev](https://serper.dev) (2,500 free queries) |
| `DATABASE_URL` | `sqlite://./data/research.db` | SQLite or PostgreSQL URL |
| `SCRAPE_RATE_LIMIT_MS` | `2000` | Delay between requests to the same domain |
| `SCRAPE_USER_AGENT` | `ResearchAssistant/1.0` | HTTP User-Agent string |
| `PUPPETEER_HEADLESS` | `true` | Run Puppeteer in headless mode |
| `SLACK_WEBHOOK_URL` | — | Slack incoming webhook for digest notifications |
| `DISCORD_WEBHOOK_URL` | — | Discord webhook for digest notifications |
| `PORT` | `3000` | Backend server port |

---

## Source Adapters

All adapters implement the `SourceAdapter` interface and register via `AdapterRegistry`. The UI automatically renders configuration forms from each adapter's `configSchema`.

| Adapter | Source | Auth Required |
|---|---|---|
| `google` | Serper (Google SERP API) | API key — [serper.dev](https://serper.dev) (2,500 free queries) |
| `web` | Any URL (Cheerio + Readability) | None |
| `reddit` | Reddit public JSON API | None |
| `twitter` | X/Twitter via Nitter instances | None |
| `zillow` | Zillow listings (Puppeteer) | None (scaffold) |
| `loopnet` | LoopNet commercial listings | None (scaffold) |
| `bizbuysell` | BizBuySell business listings | None (scaffold) |

### Adding a custom adapter

Create a single file implementing `SourceAdapter`:

```typescript
// src/adapters/mysite/MySiteAdapter.ts
import { SourceAdapter, ScrapedItem } from '../SourceAdapter';

export class MySiteAdapter implements SourceAdapter {
  name = 'mysite';
  description = 'Scrape MySite for data';
  configSchema = { type: 'object', properties: { ... }, required: [...] };

  async fetch(config: Record<string, any>): Promise<ScrapedItem[]> {
    // fetch, parse, return ScrapedItem[]
  }
}
```

Register it in [src/index.ts](src/index.ts):

```typescript
import { MySiteAdapter } from './adapters/mysite/MySiteAdapter';
registry.register(new MySiteAdapter());
```

That's it — the pipeline, storage, and UI all work automatically.

---

## API Reference

```
# Topics
GET    /api/topics                  list all topics
POST   /api/topics                  create topic
GET    /api/topics/:id              get topic detail
PUT    /api/topics/:id              update topic
DELETE /api/topics/:id              delete topic
POST   /api/topics/:id/run          trigger immediate research run

# Briefs
GET    /api/briefs                  list briefs (?topic_id= &date= &confidence=)
GET    /api/briefs/today            today's briefs
GET    /api/briefs/:id              brief with scraped source items

# Daily Digests
GET    /api/digests                 list all digests
GET    /api/digests/latest          most recent digest
GET    /api/digests/:date           digest for a specific date (YYYY-MM-DD)

# Research Runs
GET    /api/runs                    list runs (?topic_id= &status=)
GET    /api/runs/:id                run detail with scraped items

# Adapters
GET    /api/adapters                list registered adapters with config schemas

# Settings
GET    /api/settings                current (non-secret) configuration

# Search
GET    /api/search?q=...            full-text search across all briefs
```

---

## Project Structure

```
research-assistant/
├── src/
│   ├── index.ts                    Express entry point
│   ├── config.ts                   Env + defaults
│   ├── api/                        REST API route handlers
│   ├── adapters/                   Source adapter plugins
│   │   ├── SourceAdapter.ts        Interface definition
│   │   ├── AdapterRegistry.ts      Plugin registry
│   │   ├── serper/                 Google SERP via Serper API
│   │   ├── google/                 (legacy — replaced by serper/)
│   │   ├── web/
│   │   ├── reddit/
│   │   ├── twitter/
│   │   ├── zillow/                 Scaffold
│   │   ├── loopnet/                Scaffold
│   │   └── bizbuysell/             Scaffold
│   ├── scraper/                    HTTP fetching, HTML extraction, robots.txt
│   ├── pipeline/                   LangChain research pipeline
│   │   ├── ResearchPipeline.ts     Pipeline orchestrator
│   │   ├── chains/                 filter, analyze, synthesize
│   │   ├── prompts/                ChatPromptTemplate definitions
│   │   └── outputSchemas.ts        Zod schemas for LLM output
│   ├── scheduler/                  node-cron topic scheduling
│   ├── db/                         Knex connection + 5 data models
│   └── utils/                      logger, rateLimiter, notifications
├── web/                            React + Vite + Tailwind frontend
│   └── src/pages/                  Dashboard, Archive, Topics, BriefDetail, Settings
├── migrations/                     Knex migration files
├── scripts/                        seed-topics.ts, run-now.ts
├── .env.example                    Environment variable template
├── knexfile.ts                     Database configuration
└── tsconfig.json
```

---

## Research Pipeline

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  1. Gather   │───▶│  2. Filter   │───▶│  3. Analyze   │───▶│ 4. Synthesize│
│  (Adapters)  │    │  & Dedupe    │    │  (per-source) │    │  (Brief)     │
└─────────────┘    └──────────────┘    └───────────────┘    └──────────────┘
```

1. **Gather** — all configured adapters run in parallel, returning `ScrapedItem[]`
2. **Filter** — URL-based deduplication + minimum content length filter
3. **Analyze** — each item is evaluated by the LLM against the topic's quality criteria (structured JSON output via Zod)
4. **Synthesize** — all analyses are combined into a structured daily brief (headline, key findings, analysis, sources, confidence, follow-up questions)

---

## Serper Setup

1. Sign up at [serper.dev](https://serper.dev) — no credit card required
2. Copy your API key from the dashboard
3. Set `SERPER_API_KEY=<your-key>` in `.env`
4. Free tier: **2,500 queries** — plenty for nightly research runs across multiple topics

---

## Production Deployment

Build the frontend, then run the backend which serves the static files:

```bash
cd web && npm run build            # outputs to web/dist/
cd ..
npm run build                      # compiles TypeScript to dist/
NODE_ENV=production node dist/index.js
```

For PostgreSQL, set `DATABASE_URL=postgresql://user:pass@host/dbname` in `.env`.

---

## Roadmap

- [x] Phase 1 — Foundation: scaffolding, DB, adapters, scraping engine, basic API
- [x] Phase 2 — LangChain pipeline: filter, analyze, synthesize, brief storage
- [x] Phase 3 — Scheduling + core UI: dashboard, archive, topic editor
- [x] Phase 4 — Social sources: Twitter (Nitter), Reddit
- [x] Phase 5 — Custom adapters: Zillow, LoopNet, BizBuySell scaffolds
- [ ] Phase 6 — Advanced: semantic search, trend detection, auth, PDF export, MCP server, RSS feed
