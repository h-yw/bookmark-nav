import type { BookmarkItem } from '../shared/types';
import type { BookmarkUsage } from './history';
import { normalizeBookmarkHistory, pruneBookmarkHistory } from './history';
import type { OperationSnapshot } from './operationSnapshots';
import { normalizeOperationSnapshots } from './operationSnapshots';
import type { AppSettings } from './settings';
import { normalizeSettings } from './settings';
import type { BookmarkTags } from './tags';
import { normalizeBookmarkTags } from './tags';
import type { BookmarkWorkspace } from './workspaces';
import { normalizeBookmarkWorkspaces, pruneBookmarkWorkspaces } from './workspaces';

export interface BookmarkNavExportData {
  app: 'bookmark-nav';
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  history: BookmarkUsage[];
  operationSnapshots: OperationSnapshot[];
  tags: BookmarkTags;
  workspaces: BookmarkWorkspace[];
}

export interface BookmarkNavImportData {
  settings: AppSettings;
  history: BookmarkUsage[];
  operationSnapshots: OperationSnapshot[];
  tags: BookmarkTags;
  workspaces: BookmarkWorkspace[];
}

export function createBookmarkNavExportData(
  settings: AppSettings,
  history: BookmarkUsage[],
  operationSnapshots: OperationSnapshot[] = [],
  tags: BookmarkTags = {},
  workspaces: BookmarkWorkspace[] = [],
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
    workspaces: normalizeBookmarkWorkspaces(workspaces),
  };
}

export function normalizeBookmarkNavImportData(
  value: unknown,
  allBookmarks: BookmarkItem[]
): BookmarkNavImportData {
  const input = value && typeof value === 'object'
    ? value as { settings?: unknown; history?: unknown; operationSnapshots?: unknown; tags?: unknown; workspaces?: unknown }
    : {};

  return {
    settings: normalizeSettings(input.settings),
    history: pruneBookmarkHistory(
      allBookmarks,
      normalizeBookmarkHistory(input.history)
    ),
    operationSnapshots: normalizeOperationSnapshots(input.operationSnapshots),
    tags: normalizeBookmarkTags(input.tags, allBookmarks),
    workspaces: pruneBookmarkWorkspaces(normalizeBookmarkWorkspaces(input.workspaces), allBookmarks),
  };
}
