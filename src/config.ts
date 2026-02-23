import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  llm: {
    provider: (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic' | 'ollama',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    // Max parallel LLM calls during analyzeItems. Use 1-2 for Ollama (local GPU).
    concurrency: parseInt(process.env.LLM_CONCURRENCY || '5', 10),
  },

  serper: {
    apiKey: process.env.SERPER_API_KEY || '',
  },

  database: {
    url: process.env.DATABASE_URL || 'sqlite://./data/research.db',
  },

  vectorStore: {
    type: (process.env.VECTOR_STORE || 'chroma') as 'chroma' | 'pgvector',
    chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  },

  scraping: {
    rateLimitMs: parseInt(process.env.SCRAPE_RATE_LIMIT_MS || '2000', 10),
    userAgent: process.env.SCRAPE_USER_AGENT || 'ResearchAssistant/1.0',
    puppeteerHeadless: process.env.PUPPETEER_HEADLESS !== 'false',
  },

  notifications: {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    notifyEmail: process.env.NOTIFY_EMAIL || '',
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  },
};
