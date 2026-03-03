import { EventEmitter } from 'events';

// In-memory map of active run emitters. Entries are created when a manual
// run is triggered and deleted in the pipeline's finally block.
const registry = new Map<string, EventEmitter>();

export function createRunProgress(runId: string): EventEmitter {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(20); // Allow multiple SSE clients per run
  registry.set(runId, emitter);
  return emitter;
}

export function getRunProgress(runId: string): EventEmitter | undefined {
  return registry.get(runId);
}

export function deleteRunProgress(runId: string): void {
  registry.delete(runId);
}
