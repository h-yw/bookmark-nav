import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../settings';
import {
  createBookmarkNavExportData,
  normalizeBookmarkNavImportData,
} from '../localData';
import type { BookmarkItem } from '../types';

const bookmarks: BookmarkItem[] = [
  { id: '1', title: 'Alpha', url: 'https://alpha.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
  { id: '2', title: 'Beta', url: 'https://beta.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
];

describe('local data import/export', () => {
  it('creates export data without browser bookmarks', () => {
    const history = [
      { id: '1', title: 'Alpha', url: 'https://alpha.com', count: 2, lastOpened: 100 },
    ];

    expect(createBookmarkNavExportData(DEFAULT_SETTINGS, history, [], '2026-06-08T00:00:00.000Z')).toEqual({
      app: 'bookmark-nav',
      version: 1,
      exportedAt: '2026-06-08T00:00:00.000Z',
      settings: DEFAULT_SETTINGS,
      history,
      operationSnapshots: [],
    });
  });

  it('creates export data with operation snapshots', () => {
    const snapshot = {
      id: 'snapshot-1',
      type: 'batch-delete' as const,
      createdAt: 100,
      bookmarks: [bookmarks[0]],
    };

    expect(createBookmarkNavExportData(
      DEFAULT_SETTINGS,
      [],
      [snapshot],
      '2026-06-08T00:00:00.000Z'
    )).toEqual({
      app: 'bookmark-nav',
      version: 1,
      exportedAt: '2026-06-08T00:00:00.000Z',
      settings: DEFAULT_SETTINGS,
      history: [],
      operationSnapshots: [snapshot],
    });
  });

  it('normalizes settings and prunes imported history', () => {
    const result = normalizeBookmarkNavImportData({
      settings: {
        defaultSearchMode: 'web',
        searchEngine: 'bing',
        noResultWebSearch: false,
        bookmarkScope: 'nested',
        cardDensity: 'compact',
      },
      history: [
        { id: '1', title: 'Alpha', url: 'https://alpha.com', count: 2, lastOpened: 100 },
        { id: 'missing', title: 'Missing', url: 'https://missing.com', count: 1, lastOpened: 90 },
        { id: 'broken', title: 'Broken', url: 'https://broken.com', count: '1', lastOpened: 80 },
      ],
      operationSnapshots: [
        {
          id: 'snapshot-1',
          type: 'batch-move',
          createdAt: 100,
          targetFolderId: 'folder-1',
          bookmarks: [bookmarks[1]],
        },
        {
          id: 'broken',
          type: 'batch-move',
          createdAt: '100',
          bookmarks: [],
        },
      ],
    }, bookmarks);

    expect(result.settings).toEqual({
      defaultSearchMode: 'web',
      searchEngine: 'bing',
      noResultWebSearch: false,
      bookmarkScope: 'nested',
      cardDensity: 'compact',
    });
    expect(result.history).toEqual([
      { id: '1', title: 'Alpha', url: 'https://alpha.com', count: 2, lastOpened: 100 },
    ]);
    expect(result.operationSnapshots).toEqual([
      {
        id: 'snapshot-1',
        type: 'batch-move',
        createdAt: 100,
        targetFolderId: 'folder-1',
        bookmarks: [bookmarks[1]],
      },
    ]);
  });

  it('falls back to defaults for invalid imports', () => {
    expect(normalizeBookmarkNavImportData(null, bookmarks)).toEqual({
      settings: DEFAULT_SETTINGS,
      history: [],
      operationSnapshots: [],
    });
  });
});
