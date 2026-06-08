import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOperationSnapshots,
  createOperationSnapshot,
  loadOperationSnapshots,
  normalizeOperationSnapshots,
  prependOperationSnapshot,
} from '../operationSnapshots';
import type { BookmarkItem } from '../types';

const bookmark: BookmarkItem = {
  id: '1',
  title: 'Alpha',
  url: 'https://alpha.com',
  folderPath: ['Bookmarks Bar'],
  folderIdPath: ['1'],
  dateAdded: 100,
};

describe('operation snapshots', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a cloned batch delete snapshot', () => {
    const snapshot = createOperationSnapshot({
      type: 'batch-delete',
      bookmarks: [bookmark],
      createdAt: 200,
    });

    expect(snapshot).toEqual({
      id: '200-batch-delete-1',
      type: 'batch-delete',
      createdAt: 200,
      bookmarks: [bookmark],
    });
    expect(snapshot.bookmarks[0]).not.toBe(bookmark);
    expect(snapshot.bookmarks[0].folderPath).not.toBe(bookmark.folderPath);
  });

  it('normalizes valid snapshots and removes invalid entries', () => {
    expect(normalizeOperationSnapshots([
      {
        id: 'valid',
        type: 'batch-move',
        createdAt: 200,
        targetFolderId: 'folder-1',
        bookmarks: [bookmark],
      },
      {
        id: 'invalid',
        type: 'batch-delete',
        createdAt: '200',
        bookmarks: [bookmark],
      },
    ])).toEqual([
      {
        id: 'valid',
        type: 'batch-move',
        createdAt: 200,
        targetFolderId: 'folder-1',
        bookmarks: [bookmark],
      },
    ]);
  });

  it('prepends snapshots and keeps newest first', () => {
    prependOperationSnapshot(createOperationSnapshot({
      type: 'batch-delete',
      bookmarks: [bookmark],
      createdAt: 100,
    }));
    prependOperationSnapshot(createOperationSnapshot({
      type: 'batch-move',
      bookmarks: [bookmark],
      targetFolderId: 'folder-1',
      createdAt: 200,
    }));

    expect(loadOperationSnapshots().map((snapshot) => snapshot.type)).toEqual(['batch-move', 'batch-delete']);
  });

  it('clears stored snapshots', () => {
    prependOperationSnapshot(createOperationSnapshot({
      type: 'batch-delete',
      bookmarks: [bookmark],
      createdAt: 100,
    }));

    clearOperationSnapshots();

    expect(loadOperationSnapshots()).toEqual([]);
  });
});
