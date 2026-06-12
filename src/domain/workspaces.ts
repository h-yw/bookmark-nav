import type { BookmarkItem, FolderNode } from '../shared/types';
import type { BookmarkTags } from '../storage/tags';
import type { BookmarkWorkspace, BookmarkWorkspaceInput } from '../storage/workspaces';
import { filterBookmarks } from './bookmarks';

export function filterBookmarksByWorkspace(
  bookmarks: BookmarkItem[],
  bookmarkTags: BookmarkTags,
  workspace: BookmarkWorkspace,
  userQuery = ''
): BookmarkItem[] {
  const selected = new Map<string, BookmarkItem>();

  for (const bookmark of bookmarks) {
    const matchesFolder = workspace.folderIdPaths.some((path) =>
      path.every((id, index) => bookmark.folderIdPath[index] === id)
    );
    const matchesTag = workspace.tags.some((tag) => (bookmarkTags[bookmark.id] ?? []).includes(tag));

    if (matchesFolder || matchesTag) {
      selected.set(bookmark.id, bookmark);
    }
  }

  const hasStructuralConditions = workspace.folderIdPaths.length > 0 || workspace.tags.length > 0;
  let result = hasStructuralConditions ? [...selected.values()] : bookmarks;
  if (workspace.query) {
    result = filterBookmarks(result, workspace.query);
  }
  if (userQuery) {
    result = filterBookmarks(result, userQuery);
  }
  return result;
}

export function createWorkspaceInputFromFolder(
  folder: FolderNode | null,
  folderIdPath: string[]
): BookmarkWorkspaceInput | null {
  if (!folder || folderIdPath.length === 0) return null;
  return {
    name: folder.title,
    folderIdPaths: [folderIdPath],
    tags: [],
    query: '',
  };
}

export function createWorkspaceInputFromTag(tag: string | null): BookmarkWorkspaceInput | null {
  if (!tag) return null;
  return {
    name: tag,
    folderIdPaths: [],
    tags: [tag],
    query: '',
  };
}

export function getWorkspaceSummary(workspace: BookmarkWorkspace, folderLabels = new Map<string, string>()): string {
  const parts = [
    ...workspace.folderIdPaths.map((path) => folderLabels.get(path.join('/')) ?? '文件夹'),
    ...workspace.tags.map((tag) => `#${tag}`),
  ];

  if (workspace.query) {
    parts.push(`搜索：${workspace.query}`);
  }

  return parts.length > 0 ? parts.join(' · ') : '未设置条件';
}

export function buildFolderLabelMap(folders: FolderNode[]): Map<string, string> {
  const labels = new Map<string, string>();

  const walk = (items: FolderNode[], parentPath: string[] = [], parentLabels: string[] = []) => {
    for (const folder of items) {
      const path = [...parentPath, folder.id];
      const labelPath = [...parentLabels, folder.title];
      labels.set(path.join('/'), labelPath.join(' / '));
      walk(folder.children, path, labelPath);
    }
  };

  walk(folders);
  return labels;
}
