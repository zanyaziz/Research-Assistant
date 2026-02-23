import type { SourceAdapter } from './SourceAdapter';

class AdapterRegistry {
  private adapters = new Map<string, SourceAdapter>();

  register(adapter: SourceAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): SourceAdapter | undefined {
    return this.adapters.get(name);
  }

  getAll(): SourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  has(name: string): boolean {
    return this.adapters.has(name);
  }
}

export const registry = new AdapterRegistry();
