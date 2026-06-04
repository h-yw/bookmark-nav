const cache = new Map<string, string>();

export function getFaviconUrl(url: string): string {
  const cached = cache.get(url);
  if (cached !== undefined) return cached;

  let result = '';
  try {
    result = `${new URL(url).origin}/favicon.ico`;
  } catch {
    result = '';
  }

  cache.set(url, result);
  return result;
}

export function getDuckDuckGoFaviconUrl(url: string): string {
  try {
    return `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`;
  } catch {
    return '';
  }
}
