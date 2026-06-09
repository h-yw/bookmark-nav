import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getHistoryBookmarks,
  normalizeBookmarkHistory,
  pruneBookmarkHistory,
  recordBookmarkOpen,
} from '../history';
import type { BookmarkItem } from '../../shared/types';

const bookmarks: BookmarkItem[] = [
  { id: '1', title: 'Alpha', url: 'https://alpha.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
  { id: '2', title: 'Beta', url: 'https://beta.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
  { id: '3', title: 'Gamma', url: 'https://gamma.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
];

describe('bookmark history', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records opens and increments count', () => {
    const once = recordBookmarkOpen([], bookmarks[0]);
    const twice = recordBookmarkOpen(once, bookmarks[0]);

    expect(twice).toHaveLength(1);
    expect(twice[0].id).toBe('1');
    expect(twice[0].count).toBe(2);
  });

  it('returns frequent bookmarks by count', () => {
    let history = recordBookmarkOpen([], bookmarks[0]);
    history = recordBookmarkOpen(history, bookmarks[1]);
    history = recordBookmarkOpen(history, bookmarks[1]);

    const result = getHistoryBookmarks(bookmarks, history, 'frequent');
    expect(result.map((bookmark) => bookmark.id)).toEqual(['2', '1']);
  });

  it('returns recent bookmarks by last opened time', () => {
    let now = 100;
    vi.spyOn(Date, 'now').mockImplementation(() => now++);

    let history = recordBookmarkOpen([], bookmarks[0]);
    history = recordBookmarkOpen(history, bookmarks[1]);
    history = recordBookmarkOpen(history, bookmarks[2]);

    const result = getHistoryBookmarks(bookmarks, history, 'recent');
    expect(result.map((bookmark) => bookmark.id)).toEqual(['3', '2', '1']);
  });

  it('prunes history items that no longer exist', () => {
    const history = [
      { id: '1', title: 'Alpha', url: 'https://alpha.com', count: 2, lastOpened: 200 },
      { id: 'missing', title: 'Missing', url: 'https://missing.com', count: 1, lastOpened: 100 },
    ];

    expect(pruneBookmarkHistory(bookmarks, history).map((item) => item.id)).toEqual(['1']);
  });

  it('keeps history when a bookmark id changed but url still exists', () => {
    const history = [
      { id: 'old-id', title: 'Alpha', url: 'https://alpha.com', count: 2, lastOpened: 200 },
    ];

    expect(pruneBookmarkHistory(bookmarks, history)).toHaveLength(1);
  });

  it('normalizes imported history', () => {
    expect(normalizeBookmarkHistory([
      { id: '1', title: 'Alpha', url: 'https://alpha.com', count: 1, lastOpened: 100 },
      { id: '2', title: 'Broken', url: 'https://broken.com', count: '1', lastOpened: 100 },
    ])).toEqual([
      { id: '1', title: 'Alpha', url: 'https://alpha.com', count: 1, lastOpened: 100 },
    ]);
  });
});
