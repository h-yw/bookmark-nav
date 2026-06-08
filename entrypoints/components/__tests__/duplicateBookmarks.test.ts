import { describe, it, expect } from 'vitest';
import type { BookmarkItem } from '../types';
import type { BookmarkUsage } from '../history';
import type { DuplicateUrlGroup } from '../bookmarkAnalysis';

// Test the ranking logic used in DuplicateBookmarksDialog
function rankDuplicates(bookmarks: BookmarkItem[], history: BookmarkUsage[]) {
  const historyById = new Map(history.map((u) => [u.id, u]));
  const historyByUrl = new Map(history.map((u) => [u.url, u]));

  const ranked = bookmarks.map((bookmark) => {
    const usage = historyById.get(bookmark.id) ?? historyByUrl.get(bookmark.url);
    return {
      bookmark,
      lastOpened: usage?.lastOpened,
      openCount: usage?.count ?? 0,
      rank: 0,
    };
  });

  ranked.sort((a, b) => {
    const aTime = a.lastOpened ?? 0;
    const bTime = b.lastOpened ?? 0;
    if (aTime !== bTime) return bTime - aTime;
    if (a.openCount !== b.openCount) return b.openCount - a.openCount;
    return b.bookmark.dateAdded - a.bookmark.dateAdded;
  });

  ranked.forEach((item, index) => {
    item.rank = index + 1;
  });

  return ranked;
}

function makeBookmark(overrides: Partial<BookmarkItem> = {}): BookmarkItem {
  return {
    id: '1',
    title: 'Test Bookmark',
    url: 'https://example.com',
    folderPath: ['书签栏'],
    folderIdPath: ['1'],
    dateAdded: 1000,
    ...overrides,
  };
}

function makeUsage(overrides: Partial<BookmarkUsage> = {}): BookmarkUsage {
  return {
    id: '1',
    url: 'https://example.com',
    title: 'Test Bookmark',
    count: 1,
    lastOpened: Date.now(),
    ...overrides,
  };
}

describe('rankDuplicates', () => {
  it('ranks by lastOpened descending', () => {
    const now = Date.now();
    const bookmarks = [
      makeBookmark({ id: '1', url: 'https://example.com/a' }),
      makeBookmark({ id: '2', url: 'https://example.com/b' }),
      makeBookmark({ id: '3', url: 'https://example.com/c' }),
    ];
    const history = [
      makeUsage({ id: '1', url: 'https://example.com/a', lastOpened: now - 1000 }),
      makeUsage({ id: '2', url: 'https://example.com/b', lastOpened: now }),
      makeUsage({ id: '3', url: 'https://example.com/c', lastOpened: now - 5000 }),
    ];

    const ranked = rankDuplicates(bookmarks, history);
    expect(ranked[0].bookmark.id).toBe('2');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].bookmark.id).toBe('1');
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].bookmark.id).toBe('3');
    expect(ranked[2].rank).toBe(3);
  });

  it('ranks by openCount when lastOpened is equal', () => {
    const now = Date.now();
    const bookmarks = [
      makeBookmark({ id: '1', url: 'https://example.com/a' }),
      makeBookmark({ id: '2', url: 'https://example.com/b' }),
    ];
    const history = [
      makeUsage({ id: '1', url: 'https://example.com/a', lastOpened: now, count: 5 }),
      makeUsage({ id: '2', url: 'https://example.com/b', lastOpened: now, count: 10 }),
    ];

    const ranked = rankDuplicates(bookmarks, history);
    expect(ranked[0].bookmark.id).toBe('2');
    expect(ranked[0].openCount).toBe(10);
  });

  it('ranks by dateAdded when history is equal', () => {
    const bookmarks = [
      makeBookmark({ id: '1', url: 'https://example.com/a', dateAdded: 1000 }),
      makeBookmark({ id: '2', url: 'https://example.com/b', dateAdded: 2000 }),
    ];

    const ranked = rankDuplicates(bookmarks, []);
    expect(ranked[0].bookmark.id).toBe('2');
    expect(ranked[0].bookmark.dateAdded).toBe(2000);
  });

  it('handles bookmarks with no history', () => {
    const bookmarks = [
      makeBookmark({ id: '1', url: 'https://example.com/a', dateAdded: 1000 }),
      makeBookmark({ id: '2', url: 'https://example.com/b', dateAdded: 2000 }),
    ];

    const ranked = rankDuplicates(bookmarks, []);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].lastOpened).toBeUndefined();
    expect(ranked[0].openCount).toBe(0);
  });

  it('matches history by URL when ID does not match', () => {
    const now = Date.now();
    const bookmarks = [
      makeBookmark({ id: '1', url: 'https://example.com/a' }),
    ];
    const history = [
      makeUsage({ id: '999', url: 'https://example.com/a', lastOpened: now, count: 5 }),
    ];

    const ranked = rankDuplicates(bookmarks, history);
    expect(ranked[0].lastOpened).toBe(now);
    expect(ranked[0].openCount).toBe(5);
  });
});
