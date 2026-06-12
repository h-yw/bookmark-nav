import type { BookmarkItem } from '../shared/types';
import type { BookmarkUsage } from './history';
import { normalizeBookmarkHistory, pruneBookmarkHistory } from './history';
import type { OperationSnapshot } from './operationSnapshots';
import { normalizeOperationSnapshots } from './operationSnapshots';
import type { AppSettings } from './settings';
import { normalizeSettings } from './settings';
import type { BookmarkTags } from './tags';
import { normalizeBookmarkTags } from './tags';

export interface BookmarkNavExportData {
  app: 'bookmark-nav';
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  history: BookmarkUsage[];
  operationSnapshots: OperationSnapshot[];
  tags: BookmarkTags;
}

export interface BookmarkNavImportData {
  settings: AppSettings;
  history: BookmarkUsage[];
  operationSnapshots: OperationSnapshot[];
  tags: BookmarkTags;
}

export function createBookmarkNavExportData(
  settings: AppSettings,
  history: BookmarkUsage[],
  operationSnapshots: OperationSnapshot[] = [],
  tags: BookmarkTags = {},
  exportedAt = new Date().toISOString()
): BookmarkNavExportData {
  return {
    app: 'bookmark-nav',
    version: 1,
    exportedAt,
    settings,
    history,
    operationSnapshots: normalizeOperationSnapshots(operationSnapshots),
    tags: normalizeBookmarkTags(tags),
  };
}

export function normalizeBookmarkNavImportData(
  value: unknown,
  allBookmarks: BookmarkItem[]
): BookmarkNavImportData {
  const input = value && typeof value === 'object'
    ? value as { settings?: unknown; history?: unknown; operationSnapshots?: unknown; tags?: unknown }
    : {};

  return {
    settings: normalizeSettings(input.settings),
    history: pruneBookmarkHistory(
      allBookmarks,
      normalizeBookmarkHistory(input.history)
    ),
    operationSnapshots: normalizeOperationSnapshots(input.operationSnapshots),
    tags: normalizeBookmarkTags(input.tags, allBookmarks),
  };
}
