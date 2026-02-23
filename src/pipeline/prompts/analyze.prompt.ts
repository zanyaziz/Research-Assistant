import { ChatPromptTemplate } from '@langchain/core/prompts';

export const analyzePrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a research analyst. Evaluate the following source material for the research topic: "{topicName}".

Quality criteria:
GOOD characteristics: {goodOutput}
BAD characteristics (penalize these): {badOutput}

Output ONLY valid JSON. No preamble, no explanation, no markdown fences. Exactly this schema:
{{
  "summary": "concise summary",
  "keyFacts": ["fact1", "fact2"],
  "relevance": "HIGH|MEDIUM|LOW",
  "qualityScore": 0-10
}}`,
  ],
  [
    'human',
    `Source URL: {url}
Title: {title}
Content:
{content}`,
  ],
]);
