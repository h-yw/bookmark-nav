import type { BookmarkItem, FolderNode } from './types';
import type { BookmarkUsage } from './history';

export interface BookmarkUpdateInput {
  title: string;
  url: string;
}

export interface BookmarkSearchQuery {
  folder: string;
  include: string[];
  exclude: string[];
  site: string;
  text: string;
}

export interface BookmarkBatchResult {
  succeeded: BookmarkItem[];
  failed: Array<{ bookmark: BookmarkItem; error: Error }>;
}

export function flattenBookmarks(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  folderPath: string[] = [],
  folderIdPath: string[] = []
): BookmarkItem[] {
  const result: BookmarkItem[] = [];

  for (const node of nodes) {
    const title = node.title || '未命名';
    const currentPath = node.title ? [...folderPath, node.title] : folderPath;
    const currentIdPath = [...folderIdPath, node.id];

    if (node.url) {
      result.push({
        id: node.id,
        title,
        url: node.url,
        folderPath,
        folderIdPath,
        dateAdded: node.dateAdded ?? 0,
      });
    }

    if (node.children) {
      for (const item of flattenBookmarks(node.children, currentPath, currentIdPath)) {
        result.push(item);
      }
    }
  }

  return result;
}

export function buildFolderTree(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  parentPath: string[] = [],
  parentIdPath: string[] = []
): FolderNode[] {
  const folders: FolderNode[] = [];

  for (const node of nodes) {
    if (!node.children) continue;

    const title = node.title || '未命名';
    const currentPath = node.title ? [...parentPath, node.title] : parentPath;
    const currentIdPath = [...parentIdPath, node.id];
    const bookmarkCount = node.children.filter((c) => c.url).length;
    const children = buildFolderTree(node.children, currentPath, currentIdPath);

    folders.push({
      id: node.id,
      title,
      children,
      bookmarkCount,
    });
  }

  return folders;
}

export function getBookmarksInFolder(
  allBookmarks: BookmarkItem[],
  folderIdPath: string[],
  includeNested = false
): BookmarkItem[] {
  // 全部书签：返回所有书签
  if (folderIdPath.length === 0) {
    return allBookmarks;
  }

  // 根据设置显示当前文件夹的直接书签，或包含所有子文件夹里的书签
  return allBookmarks.filter((b) => {
    if (!includeNested && b.folderIdPath.length !== folderIdPath.length) return false;
    if (includeNested && b.folderIdPath.length < folderIdPath.length) return false;
    return folderIdPath.every((id, i) => b.folderIdPath[i] === id);
  });
}

export function filterBookmarks(
  allBookmarks: BookmarkItem[],
  query: string,
  history: BookmarkUsage[] = []
): BookmarkItem[] {
  const parsed = parseBookmarkSearchQuery(query);
  if (!parsed.text && !parsed.folder && !parsed.site && parsed.exclude.length === 0) return allBookmarks;
  const historyBoosts = buildHistoryBoosts(allBookmarks, history);

  return allBookmarks
    .map((bookmark, index) => ({
      bookmark,
      index,
      score: getSearchScore(bookmark, parsed.include) + (historyBoosts.get(bookmark.id) ?? 0),
    }))
    .filter((item) => {
      if (parsed.folder && !matchesFolder(item.bookmark, parsed.folder)) return false;
      if (parsed.site && !matchesSite(item.bookmark, parsed.site)) return false;
      if (parsed.exclude.some((token) => hasSearchMatch(item.bookmark, token))) return false;
      return parsed.include.length > 0 ? item.score > 0 : true;
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.bookmark);
}

export function parseBookmarkSearchQuery(query: string): BookmarkSearchQuery {
  const trimmed = query.trim().toLowerCase();
  const empty = { folder: '', include: [], exclude: [], site: '', text: '' };
  if (!trimmed) return empty;

  let folder = '';
  let text = trimmed;

  if (!trimmed.startsWith('@')) {
    text = trimmed;
  } else {
    const [folderToken = '', ...rest] = trimmed.split(/\s+/);
    folder = folderToken.slice(1);
    text = rest.join(' ').trim();
  }

  const include: string[] = [];
  const exclude: string[] = [];
  let site = '';

  for (const token of text.split(/\s+/)) {
    if (!token) continue;
    if (token.startsWith('site:')) {
      site = token.slice(5).replace(/^www\./, '');
      continue;
    }
    if (token.startsWith('-') && token.length > 1) {
      exclude.push(token.slice(1));
      continue;
    }
    include.push(token);
  }

  return {
    folder,
    include,
    exclude,
    site,
    text: include.join(' '),
  };
}

function getSearchScore(bookmark: BookmarkItem, queries: string[]): number {
  if (queries.length === 0) return 1;
  const scores = queries.map((query) => getSingleSearchScore(bookmark, query));
  if (scores.some((score) => score === 0)) return 0;
  return scores.reduce((sum, score) => sum + score, 0);
}

function getSingleSearchScore(bookmark: BookmarkItem, query: string): number {
  const title = bookmark.title.toLowerCase();
  const url = bookmark.url.toLowerCase();
  const hostname = getHostname(bookmark.url);
  const folderPath = bookmark.folderPath.join(' / ').toLowerCase();

  return Math.max(
    scoreText(title, query, 700),
    scoreText(hostname, query, 500),
    scoreText(url, query, 300),
    scoreText(folderPath, query, 120)
  );
}

function scoreText(value: string, query: string, weight: number): number {
  if (!value) return 0;
  if (value === query) return weight + 300;
  if (value.startsWith(query)) return weight + 200;
  if (value.includes(query)) return weight;
  return 0;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function matchesFolder(bookmark: BookmarkItem, folderQuery: string): boolean {
  if (!folderQuery) return true;
  return bookmark.folderPath.some((folder) => folder.toLowerCase().includes(folderQuery));
}

function matchesSite(bookmark: BookmarkItem, siteQuery: string): boolean {
  if (!siteQuery) return true;
  return getHostname(bookmark.url).includes(siteQuery);
}

function hasSearchMatch(bookmark: BookmarkItem, query: string): boolean {
  return getSingleSearchScore(bookmark, query) > 0;
}

function buildHistoryBoosts(bookmarks: BookmarkItem[], history: BookmarkUsage[]): Map<string, number> {
  if (history.length === 0) return new Map();

  const byId = new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark]));
  const byUrl = new Map(bookmarks.map((bookmark) => [bookmark.url, bookmark]));
  const sortedRecent = [...history].sort((a, b) => b.lastOpened - a.lastOpened);
  const boosts = new Map<string, number>();

  for (const usage of history) {
    const bookmark = byId.get(usage.id) ?? byUrl.get(usage.url);
    if (!bookmark) continue;
    boosts.set(bookmark.id, Math.min(usage.count * 6, 48));
  }

  sortedRecent.forEach((usage, index) => {
    const bookmark = byId.get(usage.id) ?? byUrl.get(usage.url);
    if (!bookmark) return;
    const recentBoost = Math.max(0, 42 - index * 6);
    boosts.set(bookmark.id, (boosts.get(bookmark.id) ?? 0) + recentBoost);
  });

  return boosts;
}

export function updateBookmark(id: string, changes: BookmarkUpdateInput): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.update(id, changes, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

export function removeBookmark(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.remove(id, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

export function moveBookmark(id: string, parentId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.move(id, { parentId }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

export async function executeBookmarkBatchOperation(
  bookmarks: BookmarkItem[],
  operation: (bookmark: BookmarkItem) => Promise<void>
): Promise<BookmarkBatchResult> {
  const result: BookmarkBatchResult = {
    succeeded: [],
    failed: [],
  };

  for (const bookmark of bookmarks) {
    try {
      await operation(bookmark);
      result.succeeded.push(bookmark);
    } catch (error) {
      result.failed.push({
        bookmark,
        error: error instanceof Error ? error : new Error('Unknown bookmark operation error'),
      });
    }
  }

  return result;
}
