import type { BookmarkItem } from './types';
import type { AppSettings } from './settings';
import { normalizeSettings } from './settings';
import type { BookmarkUsage } from './history';
import { normalizeBookmarkHistory, pruneBookmarkHistory } from './history';

export interface BookmarkNavExportData {
  app: 'bookmark-nav';
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  history: BookmarkUsage[];
}

export interface BookmarkNavImportData {
  settings: AppSettings;
  history: BookmarkUsage[];
}

export function createBookmarkNavExportData(
  settings: AppSettings,
  history: BookmarkUsage[],
  exportedAt = new Date().toISOString()
): BookmarkNavExportData {
  return {
    app: 'bookmark-nav',
    version: 1,
    exportedAt,
    settings,
    history,
  };
}

export function normalizeBookmarkNavImportData(
  value: unknown,
  allBookmarks: BookmarkItem[]
): BookmarkNavImportData {
  const input = value && typeof value === 'object'
    ? value as { settings?: unknown; history?: unknown }
    : {};

  return {
    settings: normalizeSettings(input.settings),
    history: pruneBookmarkHistory(
      allBookmarks,
      normalizeBookmarkHistory(input.history)
    ),
  };
}
