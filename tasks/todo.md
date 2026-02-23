# Research Assistant — Project Todo

## Status: Phase 1-5 Complete ✓

---

## Completed

- [x] Project scaffolding: Node.js 20 + TypeScript + Express backend
- [x] Database schema + Knex migrations (SQLite dev / PostgreSQL prod)
- [x] SourceAdapter interface + AdapterRegistry (plugin architecture)
- [x] Scraping engine: fetcher (axios + retry), extractor (Readability + Cheerio), robots.txt, rate limiting
- [x] GoogleSearchAdapter, WebScraperAdapter, TwitterAdapter (Nitter), RedditAdapter
- [x] ZillowAdapter, LoopNetAdapter, BizBuySellAdapter scaffolds
- [x] LangChain pipeline: filter/dedup, analyze, synthesize chains (Zod output schemas)
- [x] node-cron scheduler: per-topic nightly runs + daily digest + webhook notifications
- [x] REST API: topics CRUD, briefs, runs, digests, adapters, settings, full-text search
- [x] React + Vite + Tailwind CSS frontend (Dashboard, Archive, TopicList, TopicEditor, BriefDetail, Settings)
- [x] TypeScript: 0 compile errors

## How to run

```bash
cp .env.example .env          # fill OPENAI_API_KEY + GOOGLE_CSE_*
npm run dev                   # backend on :3000
cd web && npm run dev         # frontend on :5173 (proxies /api to :3000)
npm run seed                  # seed example topics
npm run run-now <topic-id>    # CLI pipeline trigger
```

## Phase 6 (Future)
- [ ] Semantic search (vector embeddings)
- [ ] Trend detection across briefs
- [ ] Multi-user auth
- [ ] PDF / email export
- [ ] MCP server for Claude Desktop
- [ ] RSS feed output
