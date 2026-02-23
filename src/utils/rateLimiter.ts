const lastRequestTime = new Map<string, number>();

export async function rateLimit(domain: string, delayMs: number): Promise<void> {
  const last = lastRequestTime.get(domain) || 0;
  const now = Date.now();
  const elapsed = now - last;
  if (elapsed < delayMs) {
    await new Promise((resolve) => setTimeout(resolve, delayMs - elapsed));
  }
  lastRequestTime.set(domain, Date.now());
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
