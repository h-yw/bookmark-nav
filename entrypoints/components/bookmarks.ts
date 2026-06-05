import { BookmarkItem, FolderNode } from './types';

export function flattenBookmarks(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  folderPath: string[] = [],
  folderIdPath: string[] = []
): BookmarkItem[] {
  const result: BookmarkItem[] = [];

  for (const node of nodes) {
    const title = node.title || 'Untitled';
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

    const title = node.title || 'Untitled';
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
  folderIdPath: string[]
): BookmarkItem[] {
  // "All Bookmarks" — return everything
  if (folderIdPath.length === 0) {
    return allBookmarks;
  }

  // Show bookmarks directly inside the selected folder (not nested subfolders)
  return allBookmarks.filter((b) => {
    if (b.folderIdPath.length !== folderIdPath.length) return false;
    return b.folderIdPath.every((id, i) => id === folderIdPath[i]);
  });
}

export function filterBookmarks(
  allBookmarks: BookmarkItem[],
  query: string
): BookmarkItem[] {
  const lower = query.toLowerCase();
  return allBookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(lower) ||
      b.url.toLowerCase().includes(lower)
  );
}
