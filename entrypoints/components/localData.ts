import type { BookmarkItem } from './types';
import type { AppSettings } from './settings';
import { normalizeSettings } from './settings';
import type { BookmarkUsage } from './history';
import { normalizeBookmarkHistory, pruneBookmarkHistory } from './history';
import type { OperationSnapshot } from './operationSnapshots';
import { normalizeOperationSnapshots } from './operationSnapshots';

export interface BookmarkNavExportData {
  app: 'bookmark-nav';
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  history: BookmarkUsage[];
  operationSnapshots: OperationSnapshot[];
}

export interface BookmarkNavImportData {
  settings: AppSettings;
  history: BookmarkUsage[];
  operationSnapshots: OperationSnapshot[];
}

export function createBookmarkNavExportData(
  settings: AppSettings,
  history: BookmarkUsage[],
  operationSnapshots: OperationSnapshot[] = [],
  exportedAt = new Date().toISOString()
): BookmarkNavExportData {
  return {
    app: 'bookmark-nav',
    version: 1,
    exportedAt,
    settings,
    history,
    operationSnapshots: normalizeOperationSnapshots(operationSnapshots),
  };
}

export function normalizeBookmarkNavImportData(
  value: unknown,
  allBookmarks: BookmarkItem[]
): BookmarkNavImportData {
  const input = value && typeof value === 'object'
    ? value as { settings?: unknown; history?: unknown; operationSnapshots?: unknown }
    : {};

  return {
    settings: normalizeSettings(input.settings),
    history: pruneBookmarkHistory(
      allBookmarks,
      normalizeBookmarkHistory(input.history)
    ),
    operationSnapshots: normalizeOperationSnapshots(input.operationSnapshots),
  };
}
