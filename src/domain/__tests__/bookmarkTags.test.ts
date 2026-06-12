import { describe, expect, it } from 'vitest';
import type { BookmarkItem } from '../../shared/types';
import {
  filterBookmarksByTag,
  getAllBookmarkTagSummaries,
  getBookmarkTags,
} from '../bookmarkTags';
import { filterBookmarks } from '../bookmarks';

const bookmarks: BookmarkItem[] = [
  { id: '1', title: 'Alpha', url: 'https://alpha.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
  { id: '2', title: 'Beta', url: 'https://beta.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
  { id: '3', title: 'Gamma', url: 'https://gamma.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
];

describe('bookmark tag domain helpers', () => {
  it('gets tags for a bookmark', () => {
    expect(getBookmarkTags({ 1: ['dev'] }, bookmarks[0])).toEqual(['dev']);
    expect(getBookmarkTags({}, bookmarks[0])).toEqual([]);
  });

  it('filters bookmarks by selected tag', () => {
    expect(filterBookmarksByTag(bookmarks, {
      1: ['dev'],
      2: ['docs', 'dev'],
    }, 'dev')).toEqual([bookmarks[0], bookmarks[1]]);

    expect(filterBookmarksByTag(bookmarks, {}, null)).toEqual(bookmarks);
  });

  it('combines tag filtering with bookmark search', () => {
    const tagged = filterBookmarksByTag(bookmarks, {
      1: ['dev'],
      2: ['dev'],
      3: ['docs'],
    }, 'dev');

    expect(filterBookmarks(tagged, 'alpha')).toEqual([bookmarks[0]]);
  });

  it('summarizes tags and ignores missing bookmarks', () => {
    expect(getAllBookmarkTagSummaries({
      1: ['dev'],
      2: ['docs', 'dev'],
      missing: ['old'],
    }, bookmarks)).toEqual([
      { tag: 'dev', count: 2 },
      { tag: 'docs', count: 1 },
    ]);
  });
});
