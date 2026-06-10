import type { BookmarkItem } from '../shared/types';

export type OperationSnapshotType = 'batch-delete' | 'batch-move';

export interface OperationSnapshot {
  id: string;
  type: OperationSnapshotType;
  createdAt: number;
  bookmarks: BookmarkItem[];
  targetFolderId?: string;
}

export interface OperationSnapshotRestorePlan {
  action: 'create' | 'move';
  bookmark: BookmarkItem;
  currentBookmark?: BookmarkItem;
  parentId?: string;
  canRestore: boolean;
  reason?: string;
  fallback?: boolean;
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

export function removeOperationSnapshot(id: string): OperationSnapshot[] {
  const snapshots = loadOperationSnapshots().filter((snapshot) => snapshot.id !== id);
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

export function createOperationSnapshotRestorePlan(
  snapshot: OperationSnapshot,
  currentBookmarks: BookmarkItem[],
  validFolderIds: Set<string>,
  fallbackFolderId?: string
): OperationSnapshotRestorePlan[] {
  const currentById = new Map(currentBookmarks.map((bookmark) => [bookmark.id, bookmark]));
  const currentByUrl = new Map(currentBookmarks.map((bookmark) => [bookmark.url, bookmark]));

  return snapshot.bookmarks.map((bookmark) => {
    const originalParentId = bookmark.folderIdPath.at(-1);
    const currentBookmark = currentById.get(bookmark.id) ?? currentByUrl.get(bookmark.url);

    if (snapshot.type === 'batch-delete') {
      if (currentBookmark) {
        return {
          action: 'create',
          bookmark,
          currentBookmark,
          canRestore: false,
          reason: '当前已存在相同书签',
        };
      }
      if (!originalParentId || !validFolderIds.has(originalParentId)) {
        if (fallbackFolderId && validFolderIds.has(fallbackFolderId)) {
          return {
            action: 'create',
            bookmark,
            parentId: fallbackFolderId,
            canRestore: true,
            fallback: true,
            reason: '原文件夹不存在，将恢复到默认文件夹',
          };
        }
        return {
          action: 'create',
          bookmark,
          canRestore: false,
          reason: '原文件夹不存在',
        };
      }
      return {
        action: 'create',
        bookmark,
        parentId: originalParentId,
        canRestore: true,
      };
    }

    if (!currentBookmark) {
      return {
        action: 'move',
        bookmark,
        canRestore: false,
        reason: '当前书签不存在',
      };
    }
    if (!originalParentId || !validFolderIds.has(originalParentId)) {
      if (fallbackFolderId && validFolderIds.has(fallbackFolderId)) {
        return {
          action: 'move',
          bookmark,
          currentBookmark,
          parentId: fallbackFolderId,
          canRestore: true,
          fallback: true,
          reason: '原文件夹不存在，将恢复到默认文件夹',
        };
      }
      return {
        action: 'move',
        bookmark,
        currentBookmark,
        canRestore: false,
        reason: '原文件夹不存在',
      };
    }
    return {
      action: 'move',
      bookmark,
      currentBookmark,
      parentId: originalParentId,
      canRestore: true,
    };
  });
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
