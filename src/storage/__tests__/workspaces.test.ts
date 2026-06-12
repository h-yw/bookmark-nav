import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearBookmarkWorkspaces,
  createBookmarkWorkspace,
  loadBookmarkWorkspaces,
  normalizeBookmarkWorkspaces,
  removeBookmarkWorkspace,
  saveBookmarkWorkspaces,
  upsertBookmarkWorkspace,
  WORKSPACES_STORAGE_KEY,
} from '../workspaces';

describe('bookmark workspaces', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes valid workspaces and removes invalid entries', () => {
    expect(normalizeBookmarkWorkspaces([
      { id: 'w1', name: ' Dev ', folderIdPaths: [['root']], tags: [' dev ', ''], query: ' react ' },
      { id: 'empty', name: 'Empty', folderIdPaths: [], tags: [], query: '' },
      { id: 'broken', name: '', folderIdPaths: [['root']], tags: [], query: '' },
    ])).toEqual([
      { id: 'w1', name: 'Dev', folderIdPaths: [['root']], tags: ['dev'], query: 'react' },
    ]);
  });

  it('saves, loads and clears workspaces from localStorage', () => {
    const workspace = createBookmarkWorkspace({
      name: 'Dev',
      folderIdPaths: [['root']],
      tags: [],
      query: '',
    }, 100);

    saveBookmarkWorkspaces([workspace]);
    expect(loadBookmarkWorkspaces()).toEqual([workspace]);

    clearBookmarkWorkspaces();
    expect(localStorage.getItem(WORKSPACES_STORAGE_KEY)).toBeNull();
    expect(loadBookmarkWorkspaces()).toEqual([]);
  });

  it('upserts and removes workspaces', () => {
    const workspace = createBookmarkWorkspace({
      id: 'w1',
      name: 'Dev',
      folderIdPaths: [['root']],
      tags: [],
      query: '',
    });

    const updated = upsertBookmarkWorkspace([workspace], {
      id: 'w1',
      name: 'Docs',
      folderIdPaths: [],
      tags: ['docs'],
      query: '',
    });

    expect(updated).toEqual([{ id: 'w1', name: 'Docs', folderIdPaths: [], tags: ['docs'], query: '' }]);
    expect(removeBookmarkWorkspace(updated, 'w1')).toEqual([]);
  });

  it('throws for empty workspace input', () => {
    expect(() => createBookmarkWorkspace({
      name: '',
      folderIdPaths: [],
      tags: [],
      query: '',
    })).toThrow('Invalid bookmark workspace');
  });
});
