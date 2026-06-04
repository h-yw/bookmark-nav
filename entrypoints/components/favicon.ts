import type { FaviconSource } from './settings';

const cache = new Map<string, string>();

export function getFaviconUrl(url: string, source: FaviconSource = 'site'): string {
  const cacheKey = `${source}:${url}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  let result = '';
  try {
    const parsed = new URL(url);
    result = source === 'duckduckgo'
      ? `https://icons.duckduckgo.com/ip3/${parsed.hostname}.ico`
      : `${parsed.origin}/favicon.ico`;
  } catch {
    result = '';
  }

  cache.set(cacheKey, result);
  return result;
}
