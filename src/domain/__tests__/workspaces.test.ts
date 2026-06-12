import { describe, expect, it } from 'vitest';
import type { BookmarkItem } from '../../shared/types';
import { filterBookmarksByWorkspace } from '../workspaces';
import type { BookmarkWorkspace } from '../../storage/workspaces';

const bookmarks: BookmarkItem[] = [
  { id: '1', title: 'React Docs', url: 'https://react.dev', folderPath: ['Dev'], folderIdPath: ['dev'], dateAdded: 0 },
  { id: '2', title: 'MDN CSS', url: 'https://developer.mozilla.org', folderPath: ['Docs'], folderIdPath: ['docs'], dateAdded: 0 },
  { id: '3', title: 'Recipes', url: 'https://food.example', folderPath: ['Life'], folderIdPath: ['life'], dateAdded: 0 },
];

const workspace: BookmarkWorkspace = {
  id: 'w1',
  name: 'Frontend',
  folderIdPaths: [['dev']],
  tags: ['docs'],
  query: '',
};

describe('workspace filtering', () => {
  it('matches bookmarks by folder path', () => {
    expect(filterBookmarksByWorkspace(bookmarks, {}, {
      ...workspace,
      tags: [],
    })).toEqual([bookmarks[0]]);
  });

  it('matches bookmarks by tag', () => {
    expect(filterBookmarksByWorkspace(bookmarks, {
      2: ['docs'],
    }, {
      ...workspace,
      folderIdPaths: [],
    })).toEqual([bookmarks[1]]);
  });

  it('unions folder and tag matches', () => {
    expect(filterBookmarksByWorkspace(bookmarks, {
      2: ['docs'],
    }, workspace)).toEqual([bookmarks[0], bookmarks[1]]);
  });

  it('applies workspace query and user query within workspace result', () => {
    expect(filterBookmarksByWorkspace(bookmarks, {
      2: ['docs'],
    }, {
      ...workspace,
      query: 'docs',
    }, 'mdn')).toEqual([bookmarks[1]]);
  });

  it('uses all bookmarks when workspace only has a query', () => {
    expect(filterBookmarksByWorkspace(bookmarks, {}, {
      id: 'w2',
      name: 'Search',
      folderIdPaths: [],
      tags: [],
      query: 'recipes',
    })).toEqual([bookmarks[2]]);
  });
});
