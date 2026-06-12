import type { BookmarkItem } from '../shared/types';
import { normalizeTagList } from './tags';

export interface BookmarkWorkspace {
  id: string;
  name: string;
  folderIdPaths: string[][];
  tags: string[];
  query: string;
}

export type BookmarkWorkspaceInput = Omit<BookmarkWorkspace, 'id'> & { id?: string };

export const WORKSPACES_STORAGE_KEY = 'bookmark-nav.workspaces';

function normalizeFolderIdPaths(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const paths: string[][] = [];

  for (const item of value) {
    if (!Array.isArray(item)) continue;
    const path = item.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    if (path.length === 0) continue;
    const key = path.join('/');
    if (seen.has(key)) continue;
    seen.add(key);
    paths.push(path);
  }

  return paths;
}

export function normalizeBookmarkWorkspaces(value: unknown): BookmarkWorkspace[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const input = item as Partial<BookmarkWorkspace>;
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const folderIdPaths = normalizeFolderIdPaths(input.folderIdPaths);
    const tags = normalizeTagList(input.tags);
    const query = typeof input.query === 'string' ? input.query.trim() : '';

    if (!name || (folderIdPaths.length === 0 && tags.length === 0 && !query)) return [];

    return [{
      id: typeof input.id === 'string' && input.id.trim() ? input.id : `workspace-${index}`,
      name,
      folderIdPaths,
      tags,
      query,
    }];
  });
}

export function loadBookmarkWorkspaces(): BookmarkWorkspace[] {
  try {
    return normalizeBookmarkWorkspaces(JSON.parse(localStorage.getItem(WORKSPACES_STORAGE_KEY) ?? 'null'));
  } catch {
    return [];
  }
}

export function saveBookmarkWorkspaces(workspaces: BookmarkWorkspace[]): void {
  try {
    localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(normalizeBookmarkWorkspaces(workspaces)));
  } catch {
    // 工作区只影响本地筛选入口，保存失败不影响浏览器书签。
  }
}

export function clearBookmarkWorkspaces(): void {
  try {
    localStorage.removeItem(WORKSPACES_STORAGE_KEY);
  } catch {
    // 清理失败不影响浏览器书签。
  }
}

export function createBookmarkWorkspace(input: BookmarkWorkspaceInput, now = Date.now()): BookmarkWorkspace {
  const [workspace] = normalizeBookmarkWorkspaces([{
    ...input,
    id: input.id ?? `${now}-workspace`,
  }]);

  if (!workspace) {
    throw new Error('Invalid bookmark workspace');
  }

  return workspace;
}

export function upsertBookmarkWorkspace(
  workspaces: BookmarkWorkspace[],
  input: BookmarkWorkspaceInput
): BookmarkWorkspace[] {
  const workspace = createBookmarkWorkspace(input);
  const current = normalizeBookmarkWorkspaces(workspaces);
  const index = current.findIndex((item) => item.id === workspace.id);
  if (index === -1) return [workspace, ...current];
  return current.map((item) => item.id === workspace.id ? workspace : item);
}

export function removeBookmarkWorkspace(workspaces: BookmarkWorkspace[], workspaceId: string): BookmarkWorkspace[] {
  return normalizeBookmarkWorkspaces(workspaces).filter((workspace) => workspace.id !== workspaceId);
}

export function pruneBookmarkWorkspaces(workspaces: BookmarkWorkspace[], allBookmarks: BookmarkItem[]): BookmarkWorkspace[] {
  const validFolderPathKeys = new Set(allBookmarks.map((bookmark) => bookmark.folderIdPath.join('/')));

  return normalizeBookmarkWorkspaces(workspaces)
    .map((workspace) => ({
      ...workspace,
      folderIdPaths: workspace.folderIdPaths.filter((path) =>
        [...validFolderPathKeys].some((key) => key === path.join('/') || key.startsWith(`${path.join('/')}/`))
      ),
    }))
    .filter((workspace) => workspace.folderIdPaths.length > 0 || workspace.tags.length > 0 || workspace.query);
}
