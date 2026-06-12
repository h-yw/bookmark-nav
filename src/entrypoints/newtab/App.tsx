import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { BookmarkItem, FolderNode, ViewMode } from '../../shared/types';
import {
  flattenBookmarks,
  buildFolderTree,
  getBookmarksInFolder,
  filterBookmarks,
  executeBookmarkBatchOperation,
  createBookmark,
  moveBookmark,
  removeBookmark,
  updateBookmark,
} from '../../domain/bookmarks';
import { Sidebar } from '../../components/Sidebar';
import { BookmarkGrid } from '../../components/BookmarkGrid';
import { BookmarkReport } from '../../components/BookmarkReport';
import { SearchBar } from '../../components/SearchBar';
import { SettingsDrawer } from '../../components/SettingsDrawer';
import {
  BatchAddTagsDialog,
  ClearLocalDataDialog,
  ClearHistoryDialog,
  DeleteBookmarkDialog,
  DeleteBookmarksDialog,
  EditBookmarkDialog,
  EditBookmarkTagsDialog,
  ManageTagsDialog,
  ManageWorkspacesDialog,
  MoveBookmarksDialog,
  OperationSnapshotsDialog,
  ResetSettingsDialog,
} from '../../components/BookmarkManageDialog';
import { DuplicateBookmarksDialog } from '../../components/DuplicateBookmarksDialog';
import { DeadLinkDetectionDialog } from '../../components/DeadLinkDetectionDialog';
import type { DuplicateUrlGroup } from '../../domain/bookmarkAnalysis';
import type { BookmarkCardAction } from '../../components/BookmarkCard';
import type { AppSettings, SearchEngineId } from '../../storage/settings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../storage/settings';
import { createBookmarkNavExportData, normalizeBookmarkNavImportData } from '../../storage/localData';
import { createBookmarkReport } from '../../domain/bookmarkAnalysis';
import {
  getHistoryBookmarks,
  loadBookmarkHistory,
  pruneBookmarkHistory,
  recordBookmarkOpen,
  saveBookmarkHistory,
  type BookmarkUsage,
} from '../../storage/history';
import {
  clearOperationSnapshots,
  createOperationSnapshot,
  createOperationSnapshotRestorePlan,
  loadOperationSnapshots,
  removeOperationSnapshot,
  prependOperationSnapshot,
  saveOperationSnapshots,
  type OperationSnapshot,
} from '../../storage/operationSnapshots';
import {
  clearDeadLinkDetectionRecord,
  createDeadLinkDetectionRecord,
  loadDeadLinkDetectionRecord,
  saveDeadLinkDetectionRecord,
  type DeadLinkDetectionRecord,
} from '../../storage/deadLinkRecords';
import type { DeadLinkDetectionProgress, DeadLinkResult } from '../../domain/deadLinkDetection';
import { openUrl } from '../../shared/utils';
import { filterBookmarksByTag, getAllBookmarkTagSummaries } from '../../domain/bookmarkTags';
import { filterBookmarksByWorkspace } from '../../domain/workspaces';
import {
  addTagsToBookmarks,
  clearBookmarkTags,
  deleteBookmarkTag,
  loadBookmarkTags,
  renameBookmarkTag,
  saveBookmarkTags,
  setBookmarkTags,
  type BookmarkTags,
} from '../../storage/tags';
import {
  clearBookmarkWorkspaces,
  loadBookmarkWorkspaces,
  removeBookmarkWorkspace,
  saveBookmarkWorkspaces,
  upsertBookmarkWorkspace,
  type BookmarkWorkspace,
  type BookmarkWorkspaceInput,
} from '../../storage/workspaces';

const SEARCH_URLS: Record<SearchEngineId, (query: string) => string> = {
  google: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  bing: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  duckduckgo: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  baidu: (query) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
};

const SEARCH_ENGINES_BY_ID: Record<SearchEngineId, string> = {
  google: 'Google',
  bing: 'Bing',
  duckduckgo: 'DuckDuckGo',
  baidu: '百度',
};

function getSelectedFolder(folders: FolderNode[], selectedPath: string[]): FolderNode | null {
  let currentFolders = folders;
  let selected: FolderNode | null = null;

  for (const id of selectedPath) {
    selected = currentFolders.find((folder) => folder.id === id) ?? null;
    if (!selected) return null;
    currentFolders = selected.children;
  }

  return selected;
}

function getPageTitle(searchQuery: string, viewMode: ViewMode, selectedFolder: FolderNode | null): string {
  if (searchQuery) return '搜索结果';
  if (viewMode === 'frequent') return '常用书签';
  if (viewMode === 'recent') return '最近打开';
  if (viewMode === 'report') return '整理报告';
  return selectedFolder?.title ?? '全部书签';
}

function getPageSubtitle({
  searchQuery,
  viewMode,
  selectedPath,
  selectedTag,
  count,
  includeNested,
}: {
  searchQuery: string;
  viewMode: ViewMode;
  selectedPath: string[];
  selectedTag: string | null;
  count: number;
  includeNested: boolean;
}): string {
  if (searchQuery) {
    return selectedTag
      ? `在标签“${selectedTag}”中搜索“${searchQuery}”`
      : `在全部文件夹中搜索“${searchQuery}”`;
  }
  if (viewMode === 'frequent') {
    return count > 0 ? `按打开次数排序，共 ${count} 个书签` : '打开几个书签后会自动生成常用列表';
  }
  if (viewMode === 'recent') {
    return count > 0 ? `按最近打开时间排序，共 ${count} 个书签` : '打开书签后会自动记录最近列表';
  }
  if (viewMode === 'report') {
    return '本地只读分析，不会修改浏览器书签';
  }
  if (selectedTag) return `标签“${selectedTag}”包含 ${count} 个书签`;
  if (selectedPath.length === 0) return '查看所有已保存的书签';
  return includeNested
    ? `当前文件夹及子文件夹包含 ${count} 个书签`
    : `当前文件夹包含 ${count} 个书签`;
}

export default function App() {
  const [allBookmarks, setAllBookmarks] = useState<BookmarkItem[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [history, setHistory] = useState<BookmarkUsage[]>(() => loadBookmarkHistory());
  const [bookmarkTags, setBookmarkTagsState] = useState<BookmarkTags>(() => loadBookmarkTags());
  const [workspaces, setWorkspaces] = useState<BookmarkWorkspace[]>(() => loadBookmarkWorkspaces());
  const [viewMode, setViewMode] = useState<ViewMode>('folder');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkItem | null>(null);
  const [taggingBookmark, setTaggingBookmark] = useState<BookmarkItem | null>(null);
  const [batchTagging, setBatchTagging] = useState(false);
  const [managingTags, setManagingTags] = useState(false);
  const [managingWorkspaces, setManagingWorkspaces] = useState(false);
  const [deletingBookmark, setDeletingBookmark] = useState<BookmarkItem | null>(null);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchDeletingBookmarks, setBatchDeletingBookmarks] = useState<BookmarkItem[]>([]);
  const [movingBookmarks, setMovingBookmarks] = useState<BookmarkItem[]>([]);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [clearingLocalData, setClearingLocalData] = useState(false);
  const [resettingSettings, setResettingSettings] = useState(false);
  const [operationSnapshots, setOperationSnapshots] = useState(() => loadOperationSnapshots());
  const [operationSnapshotsOpen, setOperationSnapshotsOpen] = useState(false);
  const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null);
  const [duplicateGroup, setDuplicateGroup] = useState<DuplicateUrlGroup | null>(null);
  const [deadLinkDetectionOpen, setDeadLinkDetectionOpen] = useState(false);
  const [deadLinkRecord, setDeadLinkRecord] = useState<DeadLinkDetectionRecord | null>(() => loadDeadLinkDetectionRecord());
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadBookmarks = useCallback((showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      chrome.bookmarks.getTree((tree) => {
        if (!mountedRef.current) return;
        const rootChildren = tree[0]?.children ?? [];
        const bookmarks = flattenBookmarks(rootChildren);
        setAllBookmarks(bookmarks);
        setFolders(buildFolderTree(rootChildren));
        setHistory((currentHistory) => {
          const nextHistory = pruneBookmarkHistory(bookmarks, currentHistory);
          if (nextHistory.length !== currentHistory.length) {
            saveBookmarkHistory(nextHistory);
          }
          return nextHistory;
        });
        setLoading(false);
      });
    } catch {
      if (mountedRef.current) {
        setError('书签加载失败');
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { loadBookmarks(); }, [loadBookmarks]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 1800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!actionError || editingBookmark || taggingBookmark || batchTagging || managingTags || managingWorkspaces || deletingBookmark) return;
    const timer = window.setTimeout(() => setActionError(null), 2400);
    return () => window.clearTimeout(timer);
  }, [actionError, batchTagging, deletingBookmark, editingBookmark, managingTags, managingWorkspaces, taggingBookmark]);

  useEffect(() => {
    const refreshBookmarks = () => loadBookmarks(false);
    chrome.bookmarks.onCreated.addListener(refreshBookmarks);
    chrome.bookmarks.onRemoved.addListener(refreshBookmarks);
    chrome.bookmarks.onChanged.addListener(refreshBookmarks);
    chrome.bookmarks.onMoved.addListener(refreshBookmarks);
    chrome.bookmarks.onChildrenReordered.addListener(refreshBookmarks);

    return () => {
      chrome.bookmarks.onCreated.removeListener(refreshBookmarks);
      chrome.bookmarks.onRemoved.removeListener(refreshBookmarks);
      chrome.bookmarks.onChanged.removeListener(refreshBookmarks);
      chrome.bookmarks.onMoved.removeListener(refreshBookmarks);
      chrome.bookmarks.onChildrenReordered.removeListener(refreshBookmarks);
    };
  }, [loadBookmarks]);

  const handleSettingsChange = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  const handleClearHistory = () => {
    setHistory([]);
    saveBookmarkHistory([]);
    if (viewMode !== 'folder') {
      setViewMode('folder');
    }
    setClearingHistory(false);
    setNotice('打开记录已清空');
  };

  const handleExportData = () => {
    const data = createBookmarkNavExportData(settings, history, loadOperationSnapshots(), bookmarkTags, workspaces);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookmark-nav-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('数据已导出');
  };

  const handleImportData = async (file: File) => {
    setActionError(null);
    setNotice(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const {
        settings: nextSettings,
        history: nextHistory,
        operationSnapshots,
        tags,
        workspaces: importedWorkspaces,
      } = normalizeBookmarkNavImportData(parsed, allBookmarks);

      setSettings(nextSettings);
      saveSettings(nextSettings);
      setHistory(nextHistory);
      saveBookmarkHistory(nextHistory);
      saveOperationSnapshots(operationSnapshots);
      setOperationSnapshots(operationSnapshots);
      saveBookmarkTags(tags);
      setBookmarkTagsState(tags);
      saveBookmarkWorkspaces(importedWorkspaces);
      setWorkspaces(importedWorkspaces);
      setNotice('数据已导入');
    } catch {
      setActionError('导入失败，请选择有效的 JSON 文件');
    }
  };

  const handleClearLocalData = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setHistory([]);
    saveBookmarkHistory([]);
    clearOperationSnapshots();
    clearBookmarkTags();
    clearBookmarkWorkspaces();
    clearDeadLinkDetectionRecord();
    setOperationSnapshots([]);
    setBookmarkTagsState({});
    setWorkspaces([]);
    setDeadLinkRecord(null);
    setSelectedTag(null);
    setSelectedWorkspaceId(null);
    setViewMode('folder');
    setClearingLocalData(false);
    setNotice('本地数据已清理');
  };

  const handleResetSettings = () => {
    handleSettingsChange(DEFAULT_SETTINGS);
    setResettingSettings(false);
    setNotice('设置已恢复默认');
  };

  const handleWebSearch = (query: string) => {
    const url = SEARCH_URLS[settings.searchEngine](query);
    openUrl(url);
  };

  const handleOpenBookmark = (bookmark: BookmarkItem) => {
    const nextHistory = recordBookmarkOpen(history, bookmark);
    setHistory(nextHistory);
    saveBookmarkHistory(nextHistory);
    openUrl(bookmark.url);
  };

  const handleOpenSelectedBookmark = (query: string, index: number) => {
    const selected = displayedBookmarks[Math.min(index, displayedBookmarks.length - 1)];
    if (!selected) return false;
    handleOpenBookmark(selected);
    return true;
  };

  const handleBookmarkAction = async (action: BookmarkCardAction, bookmark: BookmarkItem) => {
    setActionError(null);
    setNotice(null);

    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(bookmark.url);
        setNotice('链接已复制');
      } catch {
        setActionError('复制失败，请手动复制链接');
      }
      return;
    }

    if (action === 'edit') {
      setEditingBookmark(bookmark);
      return;
    }

    if (action === 'tags') {
      setTaggingBookmark(bookmark);
      return;
    }

    if (action === 'move') {
      setMovingBookmarks([bookmark]);
      return;
    }

    setDeletingBookmark(bookmark);
  };

  const handleSaveBookmark = async (input: { title: string; url: string }) => {
    if (!editingBookmark) return;
    setActionError(null);
    setActionPending(true);
    try {
      await updateBookmark(editingBookmark.id, input);
      setEditingBookmark(null);
      setNotice('书签已更新');
      loadBookmarks(false);
    } catch {
      setActionError('更新书签失败');
    } finally {
      setActionPending(false);
    }
  };

  const handleSaveBookmarkTags = (tags: string[]) => {
    if (!taggingBookmark) return;
    const nextTags = setBookmarkTags(bookmarkTags, taggingBookmark.id, tags);
    setBookmarkTagsState(nextTags);
    saveBookmarkTags(nextTags);
    setTaggingBookmark(null);
    setNotice(tags.length > 0 ? '标签已保存' : '标签已清空');
  };

  const handleBatchAddTags = (tags: string[]) => {
    if (selectedBookmarks.length === 0) return;
    const nextTags = addTagsToBookmarks(bookmarkTags, selectedBookmarks.map((bookmark) => bookmark.id), tags);
    setBookmarkTagsState(nextTags);
    saveBookmarkTags(nextTags);
    setBatchTagging(false);
    setSelectedBookmarkIds([]);
    setNotice(`已为 ${selectedBookmarks.length} 个书签添加标签`);
  };

  const handleRenameTag = (oldTag: string, newTag: string) => {
    const nextTags = renameBookmarkTag(bookmarkTags, oldTag, newTag);
    setBookmarkTagsState(nextTags);
    saveBookmarkTags(nextTags);
    setSelectedTag((currentTag) => currentTag === oldTag ? newTag : currentTag);
    setNotice('标签已重命名');
  };

  const handleDeleteTag = (tag: string) => {
    const nextTags = deleteBookmarkTag(bookmarkTags, tag);
    setBookmarkTagsState(nextTags);
    saveBookmarkTags(nextTags);
    setSelectedTag((currentTag) => currentTag === tag ? null : currentTag);
    setNotice('标签已删除');
  };

  const handleSaveWorkspace = (workspace: BookmarkWorkspaceInput) => {
    try {
      const nextWorkspaces = upsertBookmarkWorkspace(workspaces, workspace);
      setWorkspaces(nextWorkspaces);
      saveBookmarkWorkspaces(nextWorkspaces);
      setNotice(workspace.id ? '工作区已更新' : '工作区已创建');
    } catch {
      setActionError('工作区至少需要名称和一个条件');
    }
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    const nextWorkspaces = removeBookmarkWorkspace(workspaces, workspaceId);
    setWorkspaces(nextWorkspaces);
    saveBookmarkWorkspaces(nextWorkspaces);
    setSelectedWorkspaceId((currentId) => currentId === workspaceId ? null : currentId);
    setNotice('工作区已删除');
  };

  const handleDeleteBookmark = async () => {
    if (!deletingBookmark) return;
    setActionError(null);
    setActionPending(true);
    try {
      await removeBookmark(deletingBookmark.id);
      setDeletingBookmark(null);
      setSelectedBookmarkIds((ids) => ids.filter((id) => id !== deletingBookmark.id));
      setNotice('书签已删除');
      loadBookmarks(false);
    } catch {
      setActionError('删除书签失败');
    } finally {
      setActionPending(false);
    }
  };

  const handleToggleBookmarkSelection = (bookmark: BookmarkItem) => {
    setSelectedBookmarkIds((ids) =>
      ids.includes(bookmark.id)
        ? ids.filter((id) => id !== bookmark.id)
        : [...ids, bookmark.id]
    );
  };

  const handleCopySelectedBookmarks = async () => {
    setActionError(null);
    setNotice(null);
    try {
      await navigator.clipboard.writeText(selectedBookmarks.map((bookmark) => bookmark.url).join('\n'));
      setNotice(`已复制 ${selectedBookmarks.length} 个链接`);
    } catch {
      setActionError('批量复制失败');
    }
  };

  const handleDeleteSelectedBookmarks = async () => {
    const targetBookmarks = batchDeletingBookmarks.length > 0 ? batchDeletingBookmarks : selectedBookmarks;
    if (targetBookmarks.length === 0) return;
    setActionError(null);
    setActionPending(true);
    try {
      setOperationSnapshots(prependOperationSnapshot(createOperationSnapshot({
        type: 'batch-delete',
        bookmarks: targetBookmarks,
      })));
      const result = await executeBookmarkBatchOperation(
        targetBookmarks,
        (bookmark) => removeBookmark(bookmark.id)
      );
      setBatchDeleting(false);
      setBatchDeletingBookmarks([]);
      const succeededIds = new Set(result.succeeded.map((bookmark) => bookmark.id));
      setSelectedBookmarkIds((ids) => ids.filter((id) => !succeededIds.has(id)));
      if (result.failed.length > 0) {
        setActionError(`已删除 ${result.succeeded.length} 个，${result.failed.length} 个失败`);
      } else {
        setNotice(`已删除 ${result.succeeded.length} 个书签`);
      }
    } catch {
      setActionError('批量删除失败');
    } finally {
      loadBookmarks(false);
      setActionPending(false);
    }
  };

  const handleMoveBookmarks = async (folderId: string) => {
    if (movingBookmarks.length === 0 || !folderId) return;
    setActionError(null);
    setActionPending(true);
    try {
      setOperationSnapshots(prependOperationSnapshot(createOperationSnapshot({
        type: 'batch-move',
        bookmarks: movingBookmarks,
        targetFolderId: folderId,
      })));
      const result = await executeBookmarkBatchOperation(
        movingBookmarks,
        (bookmark) => moveBookmark(bookmark.id, folderId)
      );
      const movedIds = new Set(result.succeeded.map((bookmark) => bookmark.id));
      setSelectedBookmarkIds((ids) => ids.filter((id) => !movedIds.has(id)));
      setMovingBookmarks([]);
      if (result.failed.length > 0) {
        setActionError(`已移动 ${result.succeeded.length} 个，${result.failed.length} 个失败`);
      } else {
        setNotice(`已移动 ${result.succeeded.length} 个书签`);
      }
    } catch {
      setActionError('移动书签失败');
    } finally {
      loadBookmarks(false);
      setActionPending(false);
    }
  };

  const handleRemoveDuplicates = async (keepBookmark: BookmarkItem, removeBookmarks: BookmarkItem[]) => {
    if (removeBookmarks.length === 0) return;
    setActionError(null);
    setActionPending(true);
    try {
      setOperationSnapshots(prependOperationSnapshot(createOperationSnapshot({
        type: 'batch-delete',
        bookmarks: removeBookmarks,
      })));
      const result = await executeBookmarkBatchOperation(
        removeBookmarks,
        (bookmark) => removeBookmark(bookmark.id)
      );
      setDuplicateGroup(null);
      if (result.failed.length > 0) {
        setActionError(`已删除 ${result.succeeded.length} 个重复项，${result.failed.length} 个失败`);
      } else {
        setNotice(`已删除 ${result.succeeded.length} 个重复项，保留了 "${keepBookmark.title}"`);
      }
    } catch {
      setActionError('删除重复书签失败');
    } finally {
      loadBookmarks(false);
      setActionPending(false);
    }
  };

  const handleDeleteDeadLinks = async (deadBookmarks: BookmarkItem[]) => {
    if (deadBookmarks.length === 0) return;
    setActionError(null);
    setDeadLinkDetectionOpen(false);
    setBatchDeletingBookmarks(deadBookmarks);
    setBatchDeleting(true);
  };

  const handleDeadLinkDetectionComplete = (
    progress: DeadLinkDetectionProgress,
    results: DeadLinkResult[]
  ) => {
    const record = createDeadLinkDetectionRecord(progress, results);
    setDeadLinkRecord(record);
    saveDeadLinkDetectionRecord(record);
  };

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces]
  );
  const displayedBookmarks = useMemo(() => {
    if (selectedWorkspace) {
      return filterBookmarksByWorkspace(allBookmarks, bookmarkTags, selectedWorkspace, searchQuery);
    }
    const taggedBookmarks = filterBookmarksByTag(allBookmarks, bookmarkTags, selectedTag);
    if (searchQuery) {
      return filterBookmarks(taggedBookmarks, searchQuery, history);
    }
    if (viewMode === 'frequent') {
      return filterBookmarksByTag(getHistoryBookmarks(allBookmarks, history, 'frequent'), bookmarkTags, selectedTag);
    }
    if (viewMode === 'recent') {
      return filterBookmarksByTag(getHistoryBookmarks(allBookmarks, history, 'recent'), bookmarkTags, selectedTag);
    }
    if (viewMode === 'report') {
      return [];
    }
    const folderBookmarks = getBookmarksInFolder(
      allBookmarks,
      selectedPath,
      settings.bookmarkScope === 'nested'
    );
    return filterBookmarksByTag(folderBookmarks, bookmarkTags, selectedTag);
  }, [allBookmarks, bookmarkTags, history, searchQuery, selectedPath, selectedTag, selectedWorkspace, settings.bookmarkScope, viewMode]);

  useEffect(() => {
    setSelectedResultIndex(0);
  }, [searchQuery, selectedTag, selectedWorkspaceId]);

  useEffect(() => {
    if (selectedResultIndex >= displayedBookmarks.length) {
      setSelectedResultIndex(Math.max(0, displayedBookmarks.length - 1));
    }
  }, [displayedBookmarks.length, selectedResultIndex]);

  useEffect(() => {
    const validIds = new Set(allBookmarks.map((bookmark) => bookmark.id));
    setSelectedBookmarkIds((ids) => ids.filter((id) => validIds.has(id)));
  }, [allBookmarks]);

  const selectedFolder = useMemo(() => getSelectedFolder(folders, selectedPath), [folders, selectedPath]);
  const tagSummaries = useMemo(
    () => getAllBookmarkTagSummaries(bookmarkTags, allBookmarks),
    [allBookmarks, bookmarkTags]
  );
  const existingTags = useMemo(() => tagSummaries.map((summary) => summary.tag), [tagSummaries]);

  useEffect(() => {
    if (!selectedTag || tagSummaries.some((summary) => summary.tag === selectedTag)) return;
    setSelectedTag(null);
  }, [selectedTag, tagSummaries]);

  useEffect(() => {
    if (!selectedWorkspaceId || workspaces.some((workspace) => workspace.id === selectedWorkspaceId)) return;
    setSelectedWorkspaceId(null);
  }, [selectedWorkspaceId, workspaces]);

  const report = useMemo(
    () => createBookmarkReport(allBookmarks, folders, history),
    [allBookmarks, folders, history]
  );
  const validFolderIds = useMemo(() => new Set(getFolderIds(folders)), [folders]);
  const fallbackFolderId = folders[0]?.id;
  const operationSnapshotRestorePlans = useMemo(() => {
    const plans = new Map<string, ReturnType<typeof createOperationSnapshotRestorePlan>>();
    for (const snapshot of operationSnapshots) {
      plans.set(snapshot.id, createOperationSnapshotRestorePlan(snapshot, allBookmarks, validFolderIds, fallbackFolderId));
    }
    return plans;
  }, [allBookmarks, fallbackFolderId, operationSnapshots, validFolderIds]);
  const selectedBookmarks = useMemo(
    () => selectedBookmarkIds
      .map((id) => allBookmarks.find((bookmark) => bookmark.id === id))
      .filter((bookmark): bookmark is BookmarkItem => Boolean(bookmark)),
    [allBookmarks, selectedBookmarkIds]
  );
  const latestRestorableOperationSnapshot = useMemo(
    () => operationSnapshots.find((snapshot) =>
      (operationSnapshotRestorePlans.get(snapshot.id) ?? []).some((item) => item.canRestore)
    ) ?? null,
    [operationSnapshotRestorePlans, operationSnapshots]
  );
  const pageTitle = selectedWorkspace && !searchQuery
    ? `工作区：${selectedWorkspace.name}`
    : selectedTag && !searchQuery
      ? `标签：${selectedTag}`
      : getPageTitle(searchQuery, viewMode, selectedFolder);
  const pageSubtitle = getPageSubtitle({
    searchQuery,
    viewMode,
    selectedPath,
    selectedTag,
    count: displayedBookmarks.length,
    includeNested: settings.bookmarkScope === 'nested',
  });
  const effectivePageSubtitle = selectedWorkspace
    ? `工作区包含 ${displayedBookmarks.length} 个书签`
    : pageSubtitle;

  const handleRestoreOperationSnapshot = async (snapshot: OperationSnapshot) => {
    const plan = operationSnapshotRestorePlans.get(snapshot.id) ?? [];
    const restorableItems = plan.filter((item) => item.canRestore);
    if (restorableItems.length === 0) return;

    setActionError(null);
    setNotice(null);
    setRestoringSnapshotId(snapshot.id);

    const result = await executeBookmarkBatchOperation(
      restorableItems.map((item) => item.bookmark),
      async (bookmark) => {
        const item = restorableItems.find((planItem) => planItem.bookmark.id === bookmark.id);
        if (!item?.parentId) throw new Error('Missing restore target folder');
        if (item.action === 'create') {
          await createBookmark({
            title: item.bookmark.title,
            url: item.bookmark.url,
            parentId: item.parentId,
          });
          return;
        }
        if (!item.currentBookmark) throw new Error('Missing current bookmark');
        await moveBookmark(item.currentBookmark.id, item.parentId);
      }
    );

    if (result.failed.length > 0) {
      setActionError(`已恢复 ${result.succeeded.length} 个，${result.failed.length} 个失败`);
    } else {
      setNotice(`已恢复 ${result.succeeded.length} 个书签`);
      setOperationSnapshots(removeOperationSnapshot(snapshot.id));
    }
    setRestoringSnapshotId(null);
    loadBookmarks(false);
  };

  const handleRestoreLatestOperationSnapshot = () => {
    if (!latestRestorableOperationSnapshot) return;
    handleRestoreOperationSnapshot(latestRestorableOperationSnapshot);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F6F5F3] text-stone-900">
        <div className="hidden w-64 shrink-0 bg-[#FAFAF8] border-r border-stone-200 md:block">
          <div className="px-3 py-4 space-y-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-8 skeleton" />
            ))}
          </div>
        </div>
        <main className="flex-1 flex flex-col min-w-0">
          <div className="sticky top-0 z-10 px-4 py-4 bg-[#F6F5F3] border-b border-stone-200 md:px-8">
            <div className="h-12 rounded-xl skeleton" />
          </div>
          <div className="flex flex-wrap content-start items-start gap-3 p-4 sm:gap-4 md:p-8">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="h-24 shrink-0 rounded-xl skeleton"
                style={{ width: 'clamp(150px, calc((100% - 16px) / 2), 220px)' }}
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-[#F6F5F3] text-stone-900 items-center justify-center">
        <div className="text-center space-y-4">
          <svg className="w-10 h-10 text-stone-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-stone-500 text-sm">{error}</p>
          <button
            onClick={() => loadBookmarks()}
            className="px-5 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-sm hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-sm"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F6F5F3] text-stone-900">
      <Sidebar
        folders={folders}
        tags={tagSummaries}
        workspaces={workspaces}
        selectedPath={selectedPath}
        selectedTag={selectedTag}
        selectedWorkspaceId={selectedWorkspaceId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(path) => {
          setViewMode('folder');
          setSelectedPath(path);
          setSelectedTag(null);
          setSelectedWorkspaceId(null);
          setSearchQuery('');
          setSidebarOpen(false);
        }}
        onSelectTag={(tag) => {
          setViewMode('folder');
          setSelectedPath([]);
          setSelectedTag(tag);
          setSelectedWorkspaceId(null);
          setSidebarOpen(false);
        }}
        onManageTags={() => {
          setManagingTags(true);
          setSidebarOpen(false);
        }}
        onSelectWorkspace={(workspaceId) => {
          setViewMode('folder');
          setSelectedPath([]);
          setSelectedTag(null);
          setSelectedWorkspaceId(workspaceId);
          setSearchQuery('');
          setSidebarOpen(false);
        }}
        onManageWorkspaces={() => {
          setManagingWorkspaces(true);
          setSidebarOpen(false);
        }}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <SearchBar
          onSearch={setSearchQuery}
          onOpenSelectedBookmark={handleOpenSelectedBookmark}
          onWebSearch={handleWebSearch}
          resultCount={searchQuery ? displayedBookmarks.length : undefined}
          selectedIndex={selectedResultIndex}
          onSelectedIndexChange={setSelectedResultIndex}
          title={pageTitle}
          subtitle={effectivePageSubtitle}
          totalCount={allBookmarks.length}
          viewMode={viewMode}
          onViewModeChange={(mode) => {
            setViewMode(mode);
            setSelectedTag(null);
            setSelectedWorkspaceId(null);
            setSearchQuery('');
            setSelectedBookmarkIds([]);
          }}
          historyCount={history.length}
          defaultMode={settings.defaultSearchMode}
          searchEngine={settings.searchEngine}
          noResultWebSearch={settings.noResultWebSearch}
          onSearchEngineChange={(searchEngine) => handleSettingsChange({ ...settings, searchEngine })}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {viewMode === 'report' && !searchQuery ? (
          <BookmarkReport
            report={report}
            history={history}
            allBookmarks={allBookmarks}
            deadLinkRecord={deadLinkRecord}
            onProcessDuplicate={setDuplicateGroup}
            onNavigateToFolder={(folderIdPath) => {
              setSelectedPath(folderIdPath);
              setViewMode('folder');
              setSearchQuery('');
            }}
            onDetectDeadLinks={() => setDeadLinkDetectionOpen(true)}
          />
        ) : (
          <BookmarkGrid
            bookmarks={displayedBookmarks}
            isSearching={!!searchQuery}
            searchQuery={searchQuery}
            searchEngineLabel={SEARCH_ENGINES_BY_ID[settings.searchEngine]}
            noResultWebSearch={settings.noResultWebSearch}
            density={settings.cardDensity}
            selectedBookmarkId={searchQuery ? displayedBookmarks[selectedResultIndex]?.id ?? null : null}
            selectedBookmarkIds={selectedBookmarkIds}
            onOpenBookmark={handleOpenBookmark}
            onBookmarkAction={handleBookmarkAction}
            onToggleBookmarkSelection={handleToggleBookmarkSelection}
            onWebSearch={handleWebSearch}
          />
        )}
      </main>
      {selectedBookmarks.length > 0 && !editingBookmark && !taggingBookmark && !batchTagging && !managingTags && !managingWorkspaces && !deletingBookmark && !batchDeleting && movingBookmarks.length === 0 && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 shadow-lg">
          <span className="px-1">已选择 {selectedBookmarks.length} 个</span>
          <button
            type="button"
            onClick={handleCopySelectedBookmarks}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            复制链接
          </button>
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setBatchTagging(true);
            }}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            标签
          </button>
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setMovingBookmarks(selectedBookmarks);
            }}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            移动
          </button>
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setBatchDeletingBookmarks(selectedBookmarks);
              setBatchDeleting(true);
            }}
            className="rounded-lg border border-red-100 px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-50"
          >
            删除
          </button>
          <button
            type="button"
            onClick={() => setSelectedBookmarkIds([])}
            aria-label="清除选择"
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {(notice || actionError) && !editingBookmark && !taggingBookmark && !batchTagging && !managingTags && !managingWorkspaces && !deletingBookmark && !batchDeleting && movingBookmarks.length === 0 && selectedBookmarks.length === 0 && (
        <div className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-lg ${
          actionError
            ? 'border-red-100 bg-red-50 text-red-600'
            : 'border-stone-200 bg-white text-stone-700'
        }`}>
          {actionError ?? notice}
        </div>
      )}
      <EditBookmarkDialog
        bookmark={editingBookmark}
        error={editingBookmark ? actionError : null}
        saving={actionPending}
        onClose={() => {
          setEditingBookmark(null);
          setActionError(null);
        }}
        onSave={handleSaveBookmark}
      />
      <EditBookmarkTagsDialog
        bookmark={taggingBookmark}
        tags={taggingBookmark ? bookmarkTags[taggingBookmark.id] ?? [] : []}
        existingTags={existingTags}
        saving={actionPending}
        onClose={() => {
          setTaggingBookmark(null);
          setActionError(null);
        }}
        onSave={handleSaveBookmarkTags}
      />
      <BatchAddTagsDialog
        open={batchTagging}
        count={selectedBookmarks.length}
        existingTags={existingTags}
        saving={actionPending}
        onClose={() => {
          setBatchTagging(false);
          setActionError(null);
        }}
        onSave={handleBatchAddTags}
      />
      <ManageTagsDialog
        open={managingTags}
        tags={tagSummaries}
        saving={actionPending}
        onClose={() => {
          setManagingTags(false);
          setActionError(null);
        }}
        onRename={handleRenameTag}
        onDelete={handleDeleteTag}
      />
      <ManageWorkspacesDialog
        open={managingWorkspaces}
        workspaces={workspaces}
        folders={folders}
        tags={existingTags}
        saving={actionPending}
        onClose={() => {
          setManagingWorkspaces(false);
          setActionError(null);
        }}
        onSave={handleSaveWorkspace}
        onDelete={handleDeleteWorkspace}
      />
      <DeleteBookmarkDialog
        bookmark={deletingBookmark}
        error={deletingBookmark ? actionError : null}
        deleting={actionPending}
        onClose={() => {
          setDeletingBookmark(null);
          setActionError(null);
        }}
        onConfirm={handleDeleteBookmark}
      />
      <DeleteBookmarksDialog
        bookmarks={batchDeleting ? batchDeletingBookmarks : []}
        error={batchDeleting ? actionError : null}
        deleting={actionPending}
        onClose={() => {
          setBatchDeleting(false);
          setBatchDeletingBookmarks([]);
          setActionError(null);
        }}
        onConfirm={handleDeleteSelectedBookmarks}
      />
      <MoveBookmarksDialog
        bookmarks={movingBookmarks}
        folders={folders}
        error={movingBookmarks.length > 0 ? actionError : null}
        moving={actionPending}
        onClose={() => {
          setMovingBookmarks([]);
          setActionError(null);
        }}
        onConfirm={handleMoveBookmarks}
      />
      <ClearLocalDataDialog
        open={clearingLocalData}
        onClose={() => setClearingLocalData(false)}
        onConfirm={handleClearLocalData}
      />
      <ClearHistoryDialog
        open={clearingHistory}
        count={history.length}
        onClose={() => setClearingHistory(false)}
        onConfirm={handleClearHistory}
      />
      <ResetSettingsDialog
        open={resettingSettings}
        onClose={() => setResettingSettings(false)}
        onConfirm={handleResetSettings}
      />
      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        historyCount={history.length}
        operationSnapshotCount={operationSnapshots.length}
        operationSnapshotCanRestoreLatest={Boolean(latestRestorableOperationSnapshot)}
        restoringLatestOperationSnapshot={latestRestorableOperationSnapshot?.id === restoringSnapshotId}
        onClose={() => setSettingsOpen(false)}
        onChange={handleSettingsChange}
        onClearHistory={() => setClearingHistory(true)}
        onOpenOperationSnapshots={() => setOperationSnapshotsOpen(true)}
        onRestoreLatestOperationSnapshot={handleRestoreLatestOperationSnapshot}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onClearLocalData={() => setClearingLocalData(true)}
        onResetSettings={() => setResettingSettings(true)}
      />
      <OperationSnapshotsDialog
        open={operationSnapshotsOpen}
        snapshots={operationSnapshots}
        plansBySnapshotId={operationSnapshotRestorePlans}
        restoringSnapshotId={restoringSnapshotId}
        onClose={() => setOperationSnapshotsOpen(false)}
        onRestore={handleRestoreOperationSnapshot}
        onRemove={(snapshotId) => setOperationSnapshots(removeOperationSnapshot(snapshotId))}
      />
      <DuplicateBookmarksDialog
        group={duplicateGroup}
        history={history}
        onClose={() => setDuplicateGroup(null)}
        onConfirm={handleRemoveDuplicates}
      />
      {deadLinkDetectionOpen && (
        <DeadLinkDetectionDialog
          bookmarks={allBookmarks}
          onClose={() => setDeadLinkDetectionOpen(false)}
          onComplete={handleDeadLinkDetectionComplete}
          onDeleteDeadLinks={handleDeleteDeadLinks}
        />
      )}
    </div>
  );
}

function getFolderIds(folders: FolderNode[]): string[] {
  return folders.flatMap((folder) => [folder.id, ...getFolderIds(folder.children)]);
}
