import type { BookmarkItem } from '../shared/types';
import type { BookmarkTags } from '../storage/tags';
import type { BookmarkWorkspace } from '../storage/workspaces';
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
