import type { BookmarkItem } from './types';

export interface BookmarkUsage {
  id: string;
  url: string;
  title: string;
  count: number;
  lastOpened: number;
}

const HISTORY_STORAGE_KEY = 'bookmark-nav.bookmark-history';
const MAX_HISTORY_ITEMS = 500;

export function normalizeBookmarkHistory(value: unknown): BookmarkUsage[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is BookmarkUsage => {
    if (!item || typeof item !== 'object') return false;
    const usage = item as BookmarkUsage;
    return (
      typeof usage.id === 'string' &&
      typeof usage.url === 'string' &&
      typeof usage.title === 'string' &&
      typeof usage.count === 'number' &&
      typeof usage.lastOpened === 'number'
    );
  });
}

export function loadBookmarkHistory(): BookmarkUsage[] {
  try {
    return normalizeBookmarkHistory(JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function saveBookmarkHistory(history: BookmarkUsage[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    // 历史记录只影响常用/最近视图，存储失败不阻塞打开书签。
  }
}

export function recordBookmarkOpen(history: BookmarkUsage[], bookmark: BookmarkItem): BookmarkUsage[] {
  const now = Date.now();
  const existing = history.find((item) => item.id === bookmark.id || item.url === bookmark.url);
  const next = existing
    ? history.map((item) =>
        item === existing
          ? {
              ...item,
              id: bookmark.id,
              url: bookmark.url,
              title: bookmark.title,
              count: item.count + 1,
              lastOpened: now,
            }
          : item
      )
    : [
        {
          id: bookmark.id,
          url: bookmark.url,
          title: bookmark.title,
          count: 1,
          lastOpened: now,
        },
        ...history,
      ];

  return next.sort((a, b) => b.lastOpened - a.lastOpened).slice(0, MAX_HISTORY_ITEMS);
}

export function getHistoryBookmarks(
  bookmarks: BookmarkItem[],
  history: BookmarkUsage[],
  mode: 'frequent' | 'recent',
  limit = 60
): BookmarkItem[] {
  const byId = new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark]));
  const byUrl = new Map(bookmarks.map((bookmark) => [bookmark.url, bookmark]));
  const sortedHistory = [...history].sort((a, b) =>
    mode === 'frequent'
      ? b.count - a.count || b.lastOpened - a.lastOpened
      : b.lastOpened - a.lastOpened
  );

  const result: BookmarkItem[] = [];
  const seen = new Set<string>();

  for (const usage of sortedHistory) {
    const bookmark = byId.get(usage.id) ?? byUrl.get(usage.url);
    if (!bookmark || seen.has(bookmark.id)) continue;
    result.push(bookmark);
    seen.add(bookmark.id);
    if (result.length >= limit) break;
  }

  return result;
}

export function pruneBookmarkHistory(bookmarks: BookmarkItem[], history: BookmarkUsage[]): BookmarkUsage[] {
  const validIds = new Set(bookmarks.map((bookmark) => bookmark.id));
  const validUrls = new Set(bookmarks.map((bookmark) => bookmark.url));

  return history.filter((usage) => validIds.has(usage.id) || validUrls.has(usage.url));
}
