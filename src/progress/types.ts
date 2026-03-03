export type ProgressEvent =
  | { type: 'step'; step: number; name: string; status: 'running' | 'done' | 'failed'; pct: number; detail?: string }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string; ts: string }
  | { type: 'done'; briefId: string }
  | { type: 'error'; message: string };
