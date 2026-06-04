import { describe, it, expect } from 'vitest';
import {
  flattenBookmarks,
  buildFolderTree,
  getBookmarksInFolder,
  filterBookmarks,
} from '../bookmarks';
import { BookmarkItem } from '../types';

type Node = chrome.bookmarks.BookmarkTreeNode;

function node(
  id: string,
  title: string,
  opts: Partial<Node> = {}
): Node {
  return { id, title, ...opts } as Node;
}

describe('flattenBookmarks', () => {
  it('flattens a simple tree', () => {
    const tree: Node[] = [
      node('1', 'Folder', {
        children: [
          node('2', 'Bookmark', { url: 'https://a.com', dateAdded: 100 }),
        ],
      }),
    ];
    const result = flattenBookmarks(tree);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Bookmark');
    expect(result[0].url).toBe('https://a.com');
    expect(result[0].folderPath).toEqual(['Folder']);
    expect(result[0].folderIdPath).toEqual(['1']);
  });

  it('builds folderPath and folderIdPath correctly', () => {
    const tree: Node[] = [
      node('1', 'Root', {
        children: [
          node('2', 'Sub', {
            children: [
              node('3', 'Leaf', { url: 'https://b.com' }),
            ],
          }),
        ],
      }),
    ];
    const result = flattenBookmarks(tree, [], []);
    expect(result[0].folderPath).toEqual(['Root', 'Sub']);
    expect(result[0].folderIdPath).toEqual(['1', '2']);
  });

  it('handles empty title as Untitled', () => {
    const tree: Node[] = [
      node('1', '', {
        children: [
          node('2', '', { url: 'https://c.com' }),
        ],
      }),
    ];
    const result = flattenBookmarks(tree);
    expect(result[0].title).toBe('Untitled');
  });

  it('handles missing dateAdded', () => {
    const tree: Node[] = [node('1', 'B', { url: 'https://d.com' })];
    const result = flattenBookmarks(tree);
    expect(result[0].dateAdded).toBe(0);
  });

  it('skips folder nodes (no url)', () => {
    const tree: Node[] = [node('1', 'Folder')];
    const result = flattenBookmarks(tree);
    expect(result).toHaveLength(0);
  });

  it('handles deeply nested bookmarks without stack overflow', () => {
    let children: Node[] = [node('leaf', 'Leaf', { url: 'https://x.com' })];
    for (let i = 0; i < 100; i++) {
      children = [node(`f${i}`, `Folder${i}`, { children })];
    }
    const result = flattenBookmarks(children);
    expect(result).toHaveLength(1);
    expect(result[0].folderPath).toHaveLength(100);
  });
});

describe('buildFolderTree', () => {
  it('builds a folder tree', () => {
    const tree: Node[] = [
      node('1', 'F1', {
        children: [
          node('2', 'B1', { url: 'https://a.com' }),
          node('3', 'B2', { url: 'https://b.com' }),
          node('4', 'Sub', { children: [] }),
        ],
      }),
    ];
    const result = buildFolderTree(tree);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('F1');
    expect(result[0].bookmarkCount).toBe(2);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].title).toBe('Sub');
  });

  it('handles empty title as Untitled', () => {
    const tree: Node[] = [node('1', '', { children: [] })];
    const result = buildFolderTree(tree);
    expect(result[0].title).toBe('Untitled');
  });

  it('skips non-folder nodes', () => {
    const tree: Node[] = [
      node('1', 'Bookmark', { url: 'https://a.com' }),
    ];
    const result = buildFolderTree(tree);
    expect(result).toHaveLength(0);
  });
});

describe('getBookmarksInFolder', () => {
  const bookmarks: BookmarkItem[] = [
    { id: '1', title: 'A', url: 'https://a.com', folderPath: ['F1'], folderIdPath: ['10'], dateAdded: 0 },
    { id: '2', title: 'B', url: 'https://b.com', folderPath: ['F1', 'Sub'], folderIdPath: ['10', '20'], dateAdded: 0 },
    { id: '3', title: 'C', url: 'https://c.com', folderPath: ['F2'], folderIdPath: ['30'], dateAdded: 0 },
  ];

  it('returns all bookmarks for empty path', () => {
    expect(getBookmarksInFolder(bookmarks, [])).toHaveLength(3);
  });

  it('returns direct children only', () => {
    const result = getBookmarksInFolder(bookmarks, ['10']);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });

  it('returns nested children', () => {
    const result = getBookmarksInFolder(bookmarks, ['10', '20']);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('B');
  });

  it('returns empty for non-matching path', () => {
    expect(getBookmarksInFolder(bookmarks, ['99'])).toHaveLength(0);
  });

  it('distinguishes same-title folders by id', () => {
    const items: BookmarkItem[] = [
      { id: '1', title: 'X', url: 'https://a.com', folderPath: ['Same'], folderIdPath: ['id-1'], dateAdded: 0 },
      { id: '2', title: 'Y', url: 'https://b.com', folderPath: ['Same'], folderIdPath: ['id-2'], dateAdded: 0 },
    ];
    expect(getBookmarksInFolder(items, ['id-1'])).toHaveLength(1);
    expect(getBookmarksInFolder(items, ['id-2'])).toHaveLength(1);
  });
});

describe('filterBookmarks', () => {
  const bookmarks: BookmarkItem[] = [
    { id: '1', title: 'GitHub', url: 'https://github.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
    { id: '2', title: 'Google', url: 'https://google.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
    { id: '3', title: 'YouTube', url: 'https://youtube.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
  ];

  it('filters by title', () => {
    expect(filterBookmarks(bookmarks, 'git')).toHaveLength(1);
  });

  it('filters by url', () => {
    expect(filterBookmarks(bookmarks, 'google')).toHaveLength(1);
  });

  it('is case insensitive', () => {
    expect(filterBookmarks(bookmarks, 'GITHUB')).toHaveLength(1);
  });

  it('returns all for empty query', () => {
    expect(filterBookmarks(bookmarks, '')).toHaveLength(3);
  });

  it('returns empty for no match', () => {
    expect(filterBookmarks(bookmarks, 'zzz')).toHaveLength(0);
  });
});
