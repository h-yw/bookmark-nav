import { beforeEach, describe, expect, it } from 'vitest';
import type { DeadLinkDetectionProgress, DeadLinkResult } from '../deadLinkDetection';
import {
  clearDeadLinkDetectionRecord,
  createDeadLinkDetectionRecord,
  loadDeadLinkDetectionRecord,
  normalizeDeadLinkDetectionRecord,
  saveDeadLinkDetectionRecord,
} from '../deadLinkRecords';
import type { BookmarkItem } from '../types';

function makeBookmark(overrides: Partial<BookmarkItem> = {}): BookmarkItem {
  return {
    id: 'bookmark-1',
    title: 'Example',
    url: 'https://example.com',
    folderPath: ['书签栏'],
    folderIdPath: ['1'],
    dateAdded: 1000,
    ...overrides,
  };
}

const progress: DeadLinkDetectionProgress = {
  total: 2,
  checked: 2,
  alive: 1,
  dead: 0,
  unknown: 1,
};

describe('deadLinkRecords', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a compact detection record from progress and results', () => {
    const results: DeadLinkResult[] = [
      { bookmark: makeBookmark({ id: 'bookmark-1', title: 'Alive' }), status: 'alive' },
      {
        bookmark: makeBookmark({ id: 'bookmark-2', title: 'Unknown', url: 'https://unknown.test' }),
        status: 'unknown',
        error: '无法确认连接',
      },
    ];

    const record = createDeadLinkDetectionRecord(progress, results, 1710000000000);

    expect(record).toEqual({
      id: '1710000000000',
      createdAt: 1710000000000,
      total: 2,
      alive: 1,
      dead: 0,
      unknown: 1,
      results: [
        {
          bookmarkId: 'bookmark-1',
          title: 'Alive',
          url: 'https://example.com',
          status: 'alive',
        },
        {
          bookmarkId: 'bookmark-2',
          title: 'Unknown',
          url: 'https://unknown.test',
          status: 'unknown',
          error: '无法确认连接',
        },
      ],
    });
  });

  it('normalizes valid records and rejects invalid records', () => {
    const record = createDeadLinkDetectionRecord(progress, [], 1710000000000);

    expect(normalizeDeadLinkDetectionRecord(record)).toEqual(record);
    expect(normalizeDeadLinkDetectionRecord({ ...record, total: '2' })).toBeNull();
    expect(normalizeDeadLinkDetectionRecord({ ...record, results: [{ status: 'missing' }] })).toBeNull();
  });

  it('saves, loads, and clears the latest detection record', () => {
    const record = createDeadLinkDetectionRecord(progress, [], 1710000000000);

    saveDeadLinkDetectionRecord(record);
    expect(loadDeadLinkDetectionRecord()).toEqual(record);

    clearDeadLinkDetectionRecord();
    expect(loadDeadLinkDetectionRecord()).toBeNull();
  });
});
