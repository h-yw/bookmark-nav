import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOperationSnapshots,
  createOperationSnapshot,
  createOperationSnapshotRestorePlan,
  loadOperationSnapshots,
  normalizeOperationSnapshots,
  prependOperationSnapshot,
  removeOperationSnapshot,
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

  it('removes one stored snapshot', () => {
    const first = createOperationSnapshot({
      type: 'batch-delete',
      bookmarks: [bookmark],
      createdAt: 100,
    });
    const second = createOperationSnapshot({
      type: 'batch-move',
      bookmarks: [bookmark],
      targetFolderId: 'folder-1',
      createdAt: 200,
    });
    prependOperationSnapshot(first);
    prependOperationSnapshot(second);

    expect(removeOperationSnapshot(second.id).map((snapshot) => snapshot.id)).toEqual([first.id]);
  });

  it('plans deleted bookmark recreation in the original folder', () => {
    const snapshot = createOperationSnapshot({
      type: 'batch-delete',
      bookmarks: [bookmark],
      createdAt: 100,
    });

    expect(createOperationSnapshotRestorePlan(snapshot, [], new Set(['1']))).toEqual([
      {
        action: 'create',
        bookmark,
        parentId: '1',
        canRestore: true,
      },
    ]);
  });

  it('blocks deleted bookmark recreation when the bookmark already exists', () => {
    const snapshot = createOperationSnapshot({
      type: 'batch-delete',
      bookmarks: [bookmark],
      createdAt: 100,
    });

    expect(createOperationSnapshotRestorePlan(snapshot, [bookmark], new Set(['1']))[0]).toMatchObject({
      action: 'create',
      bookmark,
      currentBookmark: bookmark,
      canRestore: false,
      reason: '当前已存在相同书签',
    });
  });

  it('plans moved bookmark restore by current id', () => {
    const movedBookmark = {
      ...bookmark,
      folderIdPath: ['2'],
    };
    const snapshot = createOperationSnapshot({
      type: 'batch-move',
      bookmarks: [bookmark],
      targetFolderId: '2',
      createdAt: 100,
    });

    expect(createOperationSnapshotRestorePlan(snapshot, [movedBookmark], new Set(['1', '2']))).toEqual([
      {
        action: 'move',
        bookmark,
        currentBookmark: movedBookmark,
        parentId: '1',
        canRestore: true,
      },
    ]);
  });

  it('blocks moved bookmark restore when the current bookmark is missing', () => {
    const snapshot = createOperationSnapshot({
      type: 'batch-move',
      bookmarks: [bookmark],
      targetFolderId: '2',
      createdAt: 100,
    });

    expect(createOperationSnapshotRestorePlan(snapshot, [], new Set(['1']))[0]).toMatchObject({
      action: 'move',
      bookmark,
      canRestore: false,
      reason: '当前书签不存在',
    });
  });

  it('falls back when recreating a deleted bookmark and the original folder is missing', () => {
    const snapshot = createOperationSnapshot({
      type: 'batch-delete',
      bookmarks: [bookmark],
      createdAt: 100,
    });

    expect(createOperationSnapshotRestorePlan(snapshot, [], new Set(['fallback']), 'fallback')).toEqual([
      {
        action: 'create',
        bookmark,
        parentId: 'fallback',
        canRestore: true,
        fallback: true,
        reason: '原文件夹不存在，将恢复到默认文件夹',
      },
    ]);
  });

  it('falls back when moving a bookmark back and the original folder is missing', () => {
    const movedBookmark = {
      ...bookmark,
      folderIdPath: ['2'],
    };
    const snapshot = createOperationSnapshot({
      type: 'batch-move',
      bookmarks: [bookmark],
      targetFolderId: '2',
      createdAt: 100,
    });

    expect(createOperationSnapshotRestorePlan(snapshot, [movedBookmark], new Set(['fallback']), 'fallback')).toEqual([
      {
        action: 'move',
        bookmark,
        currentBookmark: movedBookmark,
        parentId: 'fallback',
        canRestore: true,
        fallback: true,
        reason: '原文件夹不存在，将恢复到默认文件夹',
      },
    ]);
  });
});
