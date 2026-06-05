import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { BookmarkItem, FolderNode, ViewMode } from '../components/types';
import {
  flattenBookmarks,
  buildFolderTree,
  getBookmarksInFolder,
  filterBookmarks,
  removeBookmark,
  updateBookmark,
} from '../components/bookmarks';
import { Sidebar } from '../components/Sidebar';
import { BookmarkGrid } from '../components/BookmarkGrid';
import { SearchBar } from '../components/SearchBar';
import { SettingsDrawer } from '../components/SettingsDrawer';
import { DeleteBookmarkDialog, EditBookmarkDialog } from '../components/BookmarkManageDialog';
import type { BookmarkCardAction } from '../components/BookmarkCard';
import type { AppSettings, SearchEngineId } from '../components/settings';
import { loadSettings, saveSettings } from '../components/settings';
import {
  getHistoryBookmarks,
  loadBookmarkHistory,
  pruneBookmarkHistory,
  recordBookmarkOpen,
  saveBookmarkHistory,
  type BookmarkUsage,
} from '../components/history';
import { openUrl } from '../components/utils';

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
  return selectedFolder?.title ?? '全部书签';
}

function getPageSubtitle({
  searchQuery,
  viewMode,
  selectedPath,
  count,
  includeNested,
}: {
  searchQuery: string;
  viewMode: ViewMode;
  selectedPath: string[];
  count: number;
  includeNested: boolean;
}): string {
  if (searchQuery) return `在全部文件夹中搜索“${searchQuery}”`;
  if (viewMode === 'frequent') {
    return count > 0 ? `按打开次数排序，共 ${count} 个书签` : '打开几个书签后会自动生成常用列表';
  }
  if (viewMode === 'recent') {
    return count > 0 ? `按最近打开时间排序，共 ${count} 个书签` : '打开书签后会自动记录最近列表';
  }
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
  const [viewMode, setViewMode] = useState<ViewMode>('folder');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkItem | null>(null);
  const [deletingBookmark, setDeletingBookmark] = useState<BookmarkItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    if (!actionError || editingBookmark || deletingBookmark) return;
    const timer = window.setTimeout(() => setActionError(null), 2400);
    return () => window.clearTimeout(timer);
  }, [actionError, deletingBookmark, editingBookmark]);

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
    const matches = query ? filterBookmarks(allBookmarks, query) : displayedBookmarks;
    const selected = matches[Math.min(index, matches.length - 1)];
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

    setDeletingBookmark(bookmark);
  };

  const handleSaveBookmark = async (input: { title: string; url: string }) => {
    if (!editingBookmark) return;
    setActionError(null);
    try {
      await updateBookmark(editingBookmark.id, input);
      setEditingBookmark(null);
      setNotice('书签已更新');
      loadBookmarks(false);
    } catch {
      setActionError('更新书签失败');
    }
  };

  const handleDeleteBookmark = async () => {
    if (!deletingBookmark) return;
    setActionError(null);
    try {
      await removeBookmark(deletingBookmark.id);
      setDeletingBookmark(null);
      setNotice('书签已删除');
      loadBookmarks(false);
    } catch {
      setActionError('删除书签失败');
    }
  };

  const displayedBookmarks = useMemo(() => {
    if (searchQuery) {
      return filterBookmarks(allBookmarks, searchQuery);
    }
    if (viewMode === 'frequent') {
      return getHistoryBookmarks(allBookmarks, history, 'frequent');
    }
    if (viewMode === 'recent') {
      return getHistoryBookmarks(allBookmarks, history, 'recent');
    }
    return getBookmarksInFolder(
      allBookmarks,
      selectedPath,
      settings.bookmarkScope === 'nested'
    );
  }, [allBookmarks, history, selectedPath, searchQuery, settings.bookmarkScope, viewMode]);

  useEffect(() => {
    setSelectedResultIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedResultIndex >= displayedBookmarks.length) {
      setSelectedResultIndex(Math.max(0, displayedBookmarks.length - 1));
    }
  }, [displayedBookmarks.length, selectedResultIndex]);

  const selectedFolder = useMemo(() => getSelectedFolder(folders, selectedPath), [folders, selectedPath]);
  const pageTitle = getPageTitle(searchQuery, viewMode, selectedFolder);
  const pageSubtitle = getPageSubtitle({
    searchQuery,
    viewMode,
    selectedPath,
    count: displayedBookmarks.length,
    includeNested: settings.bookmarkScope === 'nested',
  });

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
        selectedPath={selectedPath}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(path) => {
          setViewMode('folder');
          setSelectedPath(path);
          setSearchQuery('');
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
          subtitle={pageSubtitle}
          totalCount={allBookmarks.length}
          viewMode={viewMode}
          onViewModeChange={(mode) => {
            setViewMode(mode);
            setSearchQuery('');
          }}
          historyCount={history.length}
          defaultMode={settings.defaultSearchMode}
          searchEngine={settings.searchEngine}
          noResultWebSearch={settings.noResultWebSearch}
          onSearchEngineChange={(searchEngine) => handleSettingsChange({ ...settings, searchEngine })}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <BookmarkGrid
          bookmarks={displayedBookmarks}
          isSearching={!!searchQuery}
          searchQuery={searchQuery}
          searchEngineLabel={SEARCH_ENGINES_BY_ID[settings.searchEngine]}
          noResultWebSearch={settings.noResultWebSearch}
          density={settings.cardDensity}
          selectedBookmarkId={searchQuery ? displayedBookmarks[selectedResultIndex]?.id ?? null : null}
          onOpenBookmark={handleOpenBookmark}
          onBookmarkAction={handleBookmarkAction}
          onWebSearch={handleWebSearch}
        />
      </main>
      {(notice || actionError) && !editingBookmark && !deletingBookmark && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-lg">
          {actionError ?? notice}
        </div>
      )}
      <EditBookmarkDialog
        bookmark={editingBookmark}
        error={editingBookmark ? actionError : null}
        onClose={() => {
          setEditingBookmark(null);
          setActionError(null);
        }}
        onSave={handleSaveBookmark}
      />
      <DeleteBookmarkDialog
        bookmark={deletingBookmark}
        error={deletingBookmark ? actionError : null}
        onClose={() => {
          setDeletingBookmark(null);
          setActionError(null);
        }}
        onConfirm={handleDeleteBookmark}
      />
      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        historyCount={history.length}
        onClose={() => setSettingsOpen(false)}
        onChange={handleSettingsChange}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
}
