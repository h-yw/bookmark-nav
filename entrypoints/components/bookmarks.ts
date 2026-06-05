import type { BookmarkItem, FolderNode } from './types';

export interface BookmarkUpdateInput {
  title: string;
  url: string;
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
  query: string
): BookmarkItem[] {
  const parsed = parseBookmarkSearchQuery(query);
  if (!parsed.text && !parsed.folder) return allBookmarks;

  return allBookmarks
    .map((bookmark, index) => ({
      bookmark,
      index,
      score: getSearchScore(bookmark, parsed.text),
    }))
    .filter((item) => {
      if (parsed.folder && !matchesFolder(item.bookmark, parsed.folder)) return false;
      return parsed.text ? item.score > 0 : true;
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.bookmark);
}

export function parseBookmarkSearchQuery(query: string): { folder: string; text: string } {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed.startsWith('@')) {
    return { folder: '', text: trimmed };
  }

  const [folderToken = '', ...rest] = trimmed.split(/\s+/);
  const folder = folderToken.slice(1);
  return {
    folder,
    text: rest.join(' ').trim(),
  };
}

function getSearchScore(bookmark: BookmarkItem, query: string): number {
  if (!query) return 1;
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
