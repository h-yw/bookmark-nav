const cache = new Map<string, string>();

export function getFaviconUrl(url: string): string {
  const cached = cache.get(url);
  if (cached !== undefined) return cached;

  let result = '';
  try {
    const parsed = new URL(url);
    result = `chrome://favicon/size/32@2x/${parsed.origin}`;
  } catch {
    result = '';
  }

  cache.set(url, result);
  return result;
}
