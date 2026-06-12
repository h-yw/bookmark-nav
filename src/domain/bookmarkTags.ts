import type { BookmarkItem } from '../shared/types';
import type { BookmarkTags } from '../storage/tags';

export interface BookmarkTagSummary {
  tag: string;
  count: number;
}

export function getBookmarkTags(bookmarkTags: BookmarkTags, bookmark: BookmarkItem): string[] {
  return bookmarkTags[bookmark.id] ?? [];
}

export function getAllBookmarkTagSummaries(
  bookmarkTags: BookmarkTags,
  bookmarks: BookmarkItem[]
): BookmarkTagSummary[] {
  const validIds = new Set(bookmarks.map((bookmark) => bookmark.id));
  const counts = new Map<string, number>();

  for (const [bookmarkId, tags] of Object.entries(bookmarkTags)) {
    if (!validIds.has(bookmarkId)) continue;
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function filterBookmarksByTag(
  bookmarks: BookmarkItem[],
  bookmarkTags: BookmarkTags,
  selectedTag: string | null
): BookmarkItem[] {
  if (!selectedTag) return bookmarks;
  return bookmarks.filter((bookmark) => (bookmarkTags[bookmark.id] ?? []).includes(selectedTag));
}
