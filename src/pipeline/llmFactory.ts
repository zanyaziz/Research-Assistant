import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config';

export function buildLlm() {
  const { provider, model, temperature, openaiApiKey, ollamaBaseUrl } = config.llm;

  if (provider === 'ollama') {
    return new ChatOllama({
      model,
      temperature,
      baseUrl: ollamaBaseUrl,
    });
  }

  // Default: openai (anthropic support can be added later)
  return new ChatOpenAI({
    model,
    temperature,
    apiKey: openaiApiKey,
  });
}
