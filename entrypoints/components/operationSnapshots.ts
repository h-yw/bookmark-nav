import type { BookmarkItem } from './types';

export type OperationSnapshotType = 'batch-delete' | 'batch-move';

export interface OperationSnapshot {
  id: string;
  type: OperationSnapshotType;
  createdAt: number;
  bookmarks: BookmarkItem[];
  targetFolderId?: string;
}

export interface CreateOperationSnapshotInput {
  type: OperationSnapshotType;
  bookmarks: BookmarkItem[];
  targetFolderId?: string;
  createdAt?: number;
}

const OPERATION_SNAPSHOTS_STORAGE_KEY = 'bookmark-nav.operation-snapshots';
const MAX_OPERATION_SNAPSHOTS = 20;

export function createOperationSnapshot({
  type,
  bookmarks,
  targetFolderId,
  createdAt = Date.now(),
}: CreateOperationSnapshotInput): OperationSnapshot {
  return {
    id: `${createdAt}-${type}-${bookmarks.map((bookmark) => bookmark.id).join('-')}`,
    type,
    createdAt,
    bookmarks: bookmarks.map(cloneBookmark),
    ...(targetFolderId ? { targetFolderId } : {}),
  };
}

export function normalizeOperationSnapshots(value: unknown): OperationSnapshot[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is OperationSnapshot => {
      if (!item || typeof item !== 'object') return false;
      const snapshot = item as OperationSnapshot;
      return (
        (snapshot.type === 'batch-delete' || snapshot.type === 'batch-move') &&
        typeof snapshot.id === 'string' &&
        typeof snapshot.createdAt === 'number' &&
        Array.isArray(snapshot.bookmarks) &&
        snapshot.bookmarks.every(isBookmarkItem) &&
        (
          snapshot.targetFolderId === undefined ||
          typeof snapshot.targetFolderId === 'string'
        )
      );
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_OPERATION_SNAPSHOTS)
    .map((snapshot) => ({
      ...snapshot,
      bookmarks: snapshot.bookmarks.map(cloneBookmark),
    }));
}

export function loadOperationSnapshots(): OperationSnapshot[] {
  try {
    return normalizeOperationSnapshots(JSON.parse(localStorage.getItem(OPERATION_SNAPSHOTS_STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function saveOperationSnapshots(snapshots: OperationSnapshot[]): void {
  try {
    localStorage.setItem(
      OPERATION_SNAPSHOTS_STORAGE_KEY,
      JSON.stringify(normalizeOperationSnapshots(snapshots))
    );
  } catch {
    // Snapshot persistence is best-effort and must not block bookmark operations.
  }
}

export function prependOperationSnapshot(snapshot: OperationSnapshot): OperationSnapshot[] {
  const snapshots = normalizeOperationSnapshots([
    snapshot,
    ...loadOperationSnapshots(),
  ]);
  saveOperationSnapshots(snapshots);
  return snapshots;
}

export function clearOperationSnapshots(): void {
  try {
    localStorage.removeItem(OPERATION_SNAPSHOTS_STORAGE_KEY);
  } catch {
    // Clearing local data should continue even if localStorage is unavailable.
  }
}

function cloneBookmark(bookmark: BookmarkItem): BookmarkItem {
  return {
    ...bookmark,
    folderPath: [...bookmark.folderPath],
    folderIdPath: [...bookmark.folderIdPath],
  };
}

function isBookmarkItem(value: unknown): value is BookmarkItem {
  if (!value || typeof value !== 'object') return false;
  const bookmark = value as BookmarkItem;
  return (
    typeof bookmark.id === 'string' &&
    typeof bookmark.title === 'string' &&
    typeof bookmark.url === 'string' &&
    Array.isArray(bookmark.folderPath) &&
    bookmark.folderPath.every((item) => typeof item === 'string') &&
    Array.isArray(bookmark.folderIdPath) &&
    bookmark.folderIdPath.every((item) => typeof item === 'string') &&
    typeof bookmark.dateAdded === 'number'
  );
}
