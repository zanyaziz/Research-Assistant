import { z } from 'zod';

export const BriefSchema = z.object({
  headline: z.string().describe('Single sentence capturing the most important finding'),
  keyFindings: z.array(z.string()).describe('3-5 bullet points with specific facts and figures'),
  analysis: z.string().describe('2-3 paragraphs connecting findings to broader trends'),
  sources: z.array(z.string()).describe('Numbered list of URLs used'),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Confidence in findings'),
  followUpQuestions: z.array(z.string()).describe('2-3 questions worth investigating next'),
});

export type BriefOutput = z.infer<typeof BriefSchema>;

export const AnalysisSchema = z.object({
  summary: z.string().describe('Concise summary of this source'),
  keyFacts: z.array(z.string()).describe('Key facts and figures extracted'),
  relevance: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Relevance to the research topic'),
  qualityScore: z.number().min(0).max(10).describe('Quality score 0-10'),
});

export type AnalysisOutput = z.infer<typeof AnalysisSchema>;
