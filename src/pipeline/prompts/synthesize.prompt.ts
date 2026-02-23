import { ChatPromptTemplate } from '@langchain/core/prompts';

export const synthesizePrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a research analyst producing a daily brief on the topic: "{topicName}".

## Quality Guidelines
GOOD output characteristics:
{goodOutputCriteria}

BAD output characteristics (avoid these):
{badOutputCriteria}

## Instructions
Synthesize the source material into a {outputFormat} of no more than {maxLength} words.
Tone: {tone}

Output ONLY valid JSON matching this exact structure — no preamble, no markdown fences:
{{
  "headline": "<single sentence>",
  "keyFindings": ["<plain string fact 1>", "<plain string fact 2>", "<plain string fact 3>"],
  "analysis": "<two or three paragraphs as one string, separated by \\n\\n>",
  "sources": ["<url1>", "<url2>"],
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "followUpQuestions": ["<question 1>", "<question 2>"]
}}

Rules:
- keyFindings: MUST be an array of plain strings, not objects
- analysis: MUST be a single string, not an array
- All string values must be plain text, no nested objects`,
  ],
  [
    'human',
    `## Source Material
{analyzedSources}`,
  ],
]);
