import { beforeEach, describe, expect, it } from 'vitest';
import type { BookmarkItem } from '../../shared/types';
import {
  clearBookmarkTags,
  loadBookmarkTags,
  normalizeBookmarkTags,
  normalizeTagList,
  saveBookmarkTags,
  setBookmarkTags,
  TAGS_STORAGE_KEY,
} from '../tags';

const bookmarks: BookmarkItem[] = [
  { id: '1', title: 'Alpha', url: 'https://alpha.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
  { id: '2', title: 'Beta', url: 'https://beta.com', folderPath: [], folderIdPath: [], dateAdded: 0 },
];

describe('bookmark tags', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes tag lists by trimming, deduping and removing empty values', () => {
    expect(normalizeTagList([' dev ', '', 'docs', 'dev', 1])).toEqual(['dev', 'docs']);
  });

  it('normalizes bookmark tags and prunes missing bookmarks when provided', () => {
    expect(normalizeBookmarkTags({
      1: ['dev', 'docs'],
      2: [''],
      missing: ['old'],
    }, bookmarks)).toEqual({
      1: ['dev', 'docs'],
    });
  });

  it('saves, loads and clears tags from localStorage', () => {
    saveBookmarkTags({ 1: ['dev'] });
    expect(loadBookmarkTags()).toEqual({ 1: ['dev'] });

    clearBookmarkTags();
    expect(localStorage.getItem(TAGS_STORAGE_KEY)).toBeNull();
    expect(loadBookmarkTags()).toEqual({});
  });

  it('sets or removes tags for one bookmark', () => {
    const withTags = setBookmarkTags({}, '1', ['dev', ' dev ', 'docs']);
    expect(withTags).toEqual({ 1: ['dev', 'docs'] });

    expect(setBookmarkTags(withTags, '1', [''])).toEqual({});
  });
});
