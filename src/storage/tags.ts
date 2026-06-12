import type { BookmarkItem } from '../shared/types';

export type BookmarkTags = Record<string, string[]>;

export const TAGS_STORAGE_KEY = 'bookmark-nav.tags';

export function normalizeTagList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const tag = item.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

export function normalizeBookmarkTags(value: unknown, allBookmarks: BookmarkItem[] = []): BookmarkTags {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const validIds = allBookmarks.length > 0
    ? new Set(allBookmarks.map((bookmark) => bookmark.id))
    : null;
  const result: BookmarkTags = {};

  for (const [bookmarkId, tags] of Object.entries(value)) {
    if (!bookmarkId || (validIds && !validIds.has(bookmarkId))) continue;
    const normalizedTags = normalizeTagList(tags);
    if (normalizedTags.length > 0) {
      result[bookmarkId] = normalizedTags;
    }
  }

  return result;
}

export function loadBookmarkTags(): BookmarkTags {
  try {
    return normalizeBookmarkTags(JSON.parse(localStorage.getItem(TAGS_STORAGE_KEY) ?? 'null'));
  } catch {
    return {};
  }
}

export function saveBookmarkTags(tags: BookmarkTags): void {
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(normalizeBookmarkTags(tags)));
  } catch {
    // 标签只影响本地组织维度，保存失败不影响书签本身。
  }
}

export function clearBookmarkTags(): void {
  try {
    localStorage.removeItem(TAGS_STORAGE_KEY);
  } catch {
    // 清理失败不影响浏览器书签。
  }
}

export function setBookmarkTags(tags: BookmarkTags, bookmarkId: string, nextTags: string[]): BookmarkTags {
  const normalizedTags = normalizeTagList(nextTags);
  const next = { ...tags };

  if (normalizedTags.length === 0) {
    delete next[bookmarkId];
    return next;
  }

  next[bookmarkId] = normalizedTags;
  return next;
}
