import { describe, expect, it } from 'vitest';
import { createBookmarkReport } from '../bookmarkAnalysis';
import type { BookmarkItem, FolderNode } from '../../shared/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date('2026-06-08T00:00:00.000Z').getTime();

function bookmark(input: Partial<BookmarkItem> & Pick<BookmarkItem, 'id' | 'title' | 'url'>): BookmarkItem {
  return {
    folderPath: [],
    folderIdPath: [],
    dateAdded: now,
    ...input,
  };
}

describe('createBookmarkReport', () => {
  it('groups duplicate URLs after basic normalization', () => {
    const report = createBookmarkReport([
      bookmark({ id: '1', title: 'A', url: 'https://www.example.com/docs#intro' }),
      bookmark({ id: '2', title: 'B', url: 'https://example.com/docs' }),
      bookmark({ id: '3', title: 'C', url: 'https://other.com/docs' }),
    ], [], [], now);

    expect(report.duplicateUrlGroups).toHaveLength(1);
    expect(report.duplicateUrlGroups[0].bookmarks.map((item) => item.id)).toEqual(['1', '2']);
  });

  it('finds folders that contain no direct or nested bookmarks', () => {
    const folders: FolderNode[] = [
      {
        id: '1',
        title: 'Used',
        bookmarkCount: 0,
        children: [
          { id: '2', title: 'Child', bookmarkCount: 1, children: [] },
        ],
      },
      {
        id: '3',
        title: 'Empty',
        bookmarkCount: 0,
        children: [
          { id: '4', title: 'Nested Empty', bookmarkCount: 0, children: [] },
        ],
      },
    ];

    expect(createBookmarkReport([], folders, [], now).emptyFolders.map((folder) => folder.path)).toEqual([
      ['Empty'],
      ['Empty', 'Nested Empty'],
    ]);
  });

  it('finds weak bookmark titles', () => {
    const report = createBookmarkReport([
      bookmark({ id: '1', title: 'A', url: 'https://a.com' }),
      bookmark({ id: '2', title: 'https://b.com', url: 'https://b.com' }),
      bookmark({ id: '3', title: 'Useful Docs', url: 'https://docs.com' }),
    ], [], [], now);

    expect(report.weakTitles.map((item) => [item.bookmark.id, item.reason])).toEqual([
      ['1', '标题过短'],
      ['2', '标题像网址'],
    ]);
  });

  it('finds stale opened and never-opened bookmarks', () => {
    const report = createBookmarkReport([
      bookmark({ id: '1', title: 'Old Opened', url: 'https://old.com' }),
      bookmark({ id: '2', title: 'Never Opened', url: 'https://never.com', dateAdded: now - 181 * DAY_MS }),
      bookmark({ id: '3', title: 'Recent', url: 'https://recent.com', dateAdded: now - 10 * DAY_MS }),
    ], [], [
      { id: '1', title: 'Old Opened', url: 'https://old.com', count: 1, lastOpened: now - 91 * DAY_MS },
      { id: '3', title: 'Recent', url: 'https://recent.com', count: 1, lastOpened: now - 5 * DAY_MS },
    ], now);

    expect(report.staleBookmarks.map((item) => [item.bookmark.id, item.reason])).toEqual([
      ['2', '180 天未打开'],
      ['1', '90 天未打开'],
    ]);
  });

  it('groups similar URLs by domain when 3+ bookmarks share the same domain', () => {
    const report = createBookmarkReport([
      bookmark({ id: '1', title: 'GitHub Home', url: 'https://github.com/home' }),
      bookmark({ id: '2', title: 'GitHub Repo A', url: 'https://github.com/user/repo-a' }),
      bookmark({ id: '3', title: 'GitHub Repo B', url: 'https://github.com/user/repo-b' }),
      bookmark({ id: '4', title: 'Other Site', url: 'https://other.com/page' }),
    ], [], [], now);

    expect(report.similarUrlGroups).toHaveLength(1);
    expect(report.similarUrlGroups[0].domain).toBe('github.com');
    expect(report.similarUrlGroups[0].bookmarks).toHaveLength(3);
  });

  it('excludes duplicate URLs from similar groups', () => {
    const report = createBookmarkReport([
      bookmark({ id: '1', title: 'A', url: 'https://github.com/same' }),
      bookmark({ id: '2', title: 'B', url: 'https://github.com/same' }),
      bookmark({ id: '3', title: 'C', url: 'https://github.com/other1' }),
      bookmark({ id: '4', title: 'D', url: 'https://github.com/other2' }),
      bookmark({ id: '5', title: 'E', url: 'https://github.com/other3' }),
    ], [], [], now);

    // The duplicate pair is in duplicateUrlGroups, so similarUrlGroups only has the non-duplicate ones
    expect(report.duplicateUrlGroups).toHaveLength(1);
    expect(report.similarUrlGroups).toHaveLength(1);
    expect(report.similarUrlGroups[0].bookmarks).toHaveLength(3);
  });

  it('does not create similar groups for domains with fewer than 3 bookmarks', () => {
    const report = createBookmarkReport([
      bookmark({ id: '1', title: 'A', url: 'https://example.com/a' }),
      bookmark({ id: '2', title: 'B', url: 'https://example.com/b' }),
    ], [], [], now);

    expect(report.similarUrlGroups).toHaveLength(0);
  });
});
