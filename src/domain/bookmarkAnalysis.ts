import type { BookmarkUsage } from '../storage/history';
import type { BookmarkItem, FolderNode } from '../shared/types';

export interface DuplicateUrlGroup {
  normalizedUrl: string;
  bookmarks: BookmarkItem[];
}

export interface EmptyFolderItem {
  id: string;
  title: string;
  path: string[];
}

export interface WeakTitleItem {
  bookmark: BookmarkItem;
  reason: string;
}

export interface StaleBookmarkItem {
  bookmark: BookmarkItem;
  reason: string;
  lastOpened?: number;
}

export interface SimilarUrlGroup {
  domain: string;
  bookmarks: BookmarkItem[];
}

export interface BookmarkReport {
  duplicateUrlGroups: DuplicateUrlGroup[];
  similarUrlGroups: SimilarUrlGroup[];
  emptyFolders: EmptyFolderItem[];
  weakTitles: WeakTitleItem[];
  staleBookmarks: StaleBookmarkItem[];
}

const STALE_OPEN_DAYS = 90;
const NEVER_OPENED_STALE_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;
const GENERIC_TITLES = new Set([
  'home',
  'homepage',
  'index',
  'link',
  'new tab',
  'page',
  'site',
  'untitled',
  '未命名',
  '首页',
  '链接',
  '网页',
]);

export function createBookmarkReport(
  bookmarks: BookmarkItem[],
  folders: FolderNode[],
  history: BookmarkUsage[],
  now = Date.now()
): BookmarkReport {
  const duplicateUrlGroups = findDuplicateUrlGroups(bookmarks);
  return {
    duplicateUrlGroups,
    similarUrlGroups: findSimilarUrlGroups(bookmarks, duplicateUrlGroups),
    emptyFolders: findEmptyFolders(folders),
    weakTitles: findWeakTitles(bookmarks),
    staleBookmarks: findStaleBookmarks(bookmarks, history, now),
  };
}

function findDuplicateUrlGroups(bookmarks: BookmarkItem[]): DuplicateUrlGroup[] {
  const groups = new Map<string, BookmarkItem[]>();

  for (const bookmark of bookmarks) {
    const normalizedUrl = normalizeUrl(bookmark.url);
    if (!normalizedUrl) continue;
    groups.set(normalizedUrl, [...(groups.get(normalizedUrl) ?? []), bookmark]);
  }

  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([normalizedUrl, items]) => ({
      normalizedUrl,
      bookmarks: items.sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => b.bookmarks.length - a.bookmarks.length || a.normalizedUrl.localeCompare(b.normalizedUrl));
}

function findSimilarUrlGroups(bookmarks: BookmarkItem[], duplicateGroups: DuplicateUrlGroup[]): SimilarUrlGroup[] {
  // Build set of URLs already covered by duplicate detection
  const duplicateUrls = new Set<string>();
  for (const group of duplicateGroups) {
    for (const bookmark of group.bookmarks) {
      duplicateUrls.add(bookmark.url);
    }
  }

  // Group by domain
  const byDomain = new Map<string, BookmarkItem[]>();
  for (const bookmark of bookmarks) {
    // Skip URLs already in duplicate groups
    if (duplicateUrls.has(bookmark.url)) continue;
    const domain = getDomain(bookmark.url);
    if (!domain) continue;
    byDomain.set(domain, [...(byDomain.get(domain) ?? []), bookmark]);
  }

  // Filter to groups with 3+ bookmarks (2-book groups are less interesting)
  return [...byDomain.entries()]
    .filter(([, items]) => items.length >= 3)
    .map(([domain, items]) => ({
      domain,
      bookmarks: items.sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => b.bookmarks.length - a.bookmarks.length || a.domain.localeCompare(b.domain));
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function findEmptyFolders(folders: FolderNode[]): EmptyFolderItem[] {
  const result: EmptyFolderItem[] = [];

  function visit(folder: FolderNode, path: string[]): number {
    const currentPath = [...path, folder.title];
    const childBookmarkCount = folder.children.reduce((sum, child) => sum + visit(child, currentPath), 0);
    const totalBookmarkCount = folder.bookmarkCount + childBookmarkCount;

    if (totalBookmarkCount === 0) {
      result.push({
        id: folder.id,
        title: folder.title,
        path: currentPath,
      });
    }

    return totalBookmarkCount;
  }

  for (const folder of folders) {
    visit(folder, []);
  }

  return result.sort((a, b) => a.path.join('/').localeCompare(b.path.join('/')));
}

function findWeakTitles(bookmarks: BookmarkItem[]): WeakTitleItem[] {
  return bookmarks
    .map((bookmark) => {
      const reason = getWeakTitleReason(bookmark);
      return reason ? { bookmark, reason } : null;
    })
    .filter((item): item is WeakTitleItem => Boolean(item))
    .sort((a, b) => a.bookmark.title.localeCompare(b.bookmark.title));
}

function findStaleBookmarks(
  bookmarks: BookmarkItem[],
  history: BookmarkUsage[],
  now: number
): StaleBookmarkItem[] {
  const historyById = new Map(history.map((usage) => [usage.id, usage]));
  const historyByUrl = new Map(history.map((usage) => [usage.url, usage]));
  const staleOpenedBefore = now - STALE_OPEN_DAYS * DAY_MS;
  const staleCreatedBefore = now - NEVER_OPENED_STALE_DAYS * DAY_MS;

  return bookmarks
    .map((bookmark) => {
      const usage = historyById.get(bookmark.id) ?? historyByUrl.get(bookmark.url);
      if (usage && usage.lastOpened <= staleOpenedBefore) {
        return {
          bookmark,
          lastOpened: usage.lastOpened,
          reason: `${STALE_OPEN_DAYS} 天未打开`,
        };
      }
      if (!usage && bookmark.dateAdded > 0 && bookmark.dateAdded <= staleCreatedBefore) {
        return {
          bookmark,
          reason: `${NEVER_OPENED_STALE_DAYS} 天未打开`,
        };
      }
      return null;
    })
    .filter((item): item is StaleBookmarkItem => Boolean(item))
    .sort((a, b) => {
      const aTime = a.lastOpened ?? a.bookmark.dateAdded;
      const bTime = b.lastOpened ?? b.bookmark.dateAdded;
      return aTime - bTime;
    });
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }
    return parsed.toString();
  } catch {
    return url.trim().toLowerCase();
  }
}

function getWeakTitleReason(bookmark: BookmarkItem): string | null {
  const title = bookmark.title.trim();
  const lowerTitle = title.toLowerCase();

  if (title.length <= 2) return '标题过短';
  if (GENERIC_TITLES.has(lowerTitle)) return '标题过于通用';
  if (looksLikeUrl(title)) return '标题像网址';
  if (title === bookmark.url) return '标题与 URL 相同';
  return null;
}

function looksLikeUrl(value: string): boolean {
  const lowerValue = value.toLowerCase();
  return lowerValue.startsWith('http://') || lowerValue.startsWith('https://') || lowerValue.startsWith('www.');
}
