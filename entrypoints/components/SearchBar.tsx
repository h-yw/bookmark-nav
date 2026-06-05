import { useState, useCallback, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { ReactNode } from 'react';
import type { SearchEngineId, SearchMode } from './settings';
import { SEARCH_ENGINES } from './settings';

type ViewMode = 'folder' | 'frequent' | 'recent';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onOpenSelectedBookmark: (query: string, index: number) => boolean;
  onWebSearch: (query: string) => void;
  resultCount?: number;
  selectedIndex: number;
  onSelectedIndexChange: Dispatch<SetStateAction<number>>;
  title: string;
  subtitle: string;
  totalCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  historyCount: number;
  defaultMode: SearchMode;
  searchEngine: SearchEngineId;
  noResultWebSearch: boolean;
  onSearchEngineChange: (engine: SearchEngineId) => void;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
}

export function SearchBar({
  onSearch,
  onOpenSelectedBookmark,
  onWebSearch,
  resultCount,
  selectedIndex,
  onSelectedIndexChange,
  title,
  subtitle,
  totalCount,
  viewMode,
  onViewModeChange,
  historyCount,
  defaultMode,
  searchEngine,
  noResultWebSearch,
  onSearchEngineChange,
  onOpenSidebar,
  onOpenSettings,
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<SearchMode>(defaultMode);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedEngine = SEARCH_ENGINES.find((engine) => engine.id === searchEngine) ?? SEARCH_ENGINES[0];

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    setMode(defaultMode);
    onSearch(defaultMode === 'bookmarks' ? value : '');
  }, [defaultMode, onSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setValue('');
        clearTimeout(timerRef.current);
        onSearch('');
        inputRef.current?.blur();
      }
      if (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey) && document.activeElement === inputRef.current) {
        e.preventDefault();
        setMode((current) => {
          const next = current === 'bookmarks' ? 'web' : 'bookmarks';
          onSearch(next === 'bookmarks' ? value : '');
          return next;
        });
      }
      if (document.activeElement === inputRef.current && mode === 'bookmarks' && value && resultCount) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          onSelectedIndexChange((selectedIndex + 1) % resultCount);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onSelectedIndexChange((selectedIndex - 1 + resultCount) % resultCount);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mode, onSearch, onSelectedIndexChange, resultCount, selectedIndex, value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setValue(q);
      clearTimeout(timerRef.current);
      onSelectedIndexChange(0);
      if (mode === 'bookmarks') {
        timerRef.current = setTimeout(() => onSearch(q), 200);
      }
    },
    [mode, onSearch, onSelectedIndexChange]
  );

  const handleModeChange = (nextMode: SearchMode) => {
    setMode(nextMode);
    clearTimeout(timerRef.current);
    onSelectedIndexChange(0);
    onSearch(nextMode === 'bookmarks' ? value : '');
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    if (mode === 'bookmarks' && onOpenSelectedBookmark(q, selectedIndex)) return;
    if (mode === 'bookmarks' && !noResultWebSearch) return;
    onWebSearch(q);
  };

  const handleClear = () => {
    setValue('');
    clearTimeout(timerRef.current);
    onSelectedIndexChange(0);
    onSearch('');
    inputRef.current?.focus();
  };

  const hint = mode === 'bookmarks'
    ? value && resultCount === 0
      ? noResultWebSearch
        ? `没有匹配的书签，可使用 ${selectedEngine.label} 搜索`
        : '没有匹配的书签'
      : value && resultCount !== undefined
        ? `找到 ${resultCount} 个书签`
        : '输入关键词筛选书签'
    : `使用 ${selectedEngine.label} 搜索网页`;

  const primaryAction = mode === 'bookmarks'
    ? value && resultCount !== 0
      ? '打开选中结果'
      : noResultWebSearch
        ? '网页搜索'
        : ''
    : '网页搜索';

  return (
    <div className="sticky top-0 z-10 border-b border-stone-200 bg-[#F6F5F3]/95 px-4 py-4 backdrop-blur md:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full min-w-0 items-start gap-3 lg:w-auto lg:max-w-[42%]">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="打开文件夹列表"
            className="mt-0.5 rounded-lg border border-stone-200 bg-white p-2 text-stone-500 shadow-sm transition-colors hover:border-stone-300 hover:text-stone-800 md:hidden"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="min-w-0 flex-1 lg:flex-none">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-stone-900">{title}</h1>
              <span className="hidden rounded-full bg-white px-2 py-1 text-xs text-stone-500 shadow-sm ring-1 ring-stone-200 sm:inline">
                {totalCount}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-stone-500">{subtitle}</p>
          </div>
          <SettingsButton onClick={onOpenSettings} className="mt-0.5 h-9 w-9 px-0 lg:hidden" />
        </div>
        <div className="flex rounded-lg bg-stone-100 p-0.5 lg:hidden" role="tablist" aria-label="视图切换">
          <ViewButton active={viewMode === 'folder'} onClick={() => onViewModeChange('folder')}>
            全部
          </ViewButton>
          <ViewButton active={viewMode === 'frequent'} onClick={() => onViewModeChange('frequent')} disabled={historyCount === 0}>
            常用
          </ViewButton>
          <ViewButton active={viewMode === 'recent'} onClick={() => onViewModeChange('recent')} disabled={historyCount === 0}>
            最近
          </ViewButton>
        </div>
        <div className="flex w-full items-stretch gap-2 lg:max-w-2xl">
          <form
            onSubmit={handleSubmit}
            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white p-1.5 shadow-sm transition-all focus-within:border-stone-400 focus-within:shadow-md"
          >
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 rounded-lg bg-stone-100 p-0.5" role="tablist" aria-label="搜索模式">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'bookmarks'}
                onClick={() => handleModeChange('bookmarks')}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  mode === 'bookmarks'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                书签
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'web'}
                onClick={() => handleModeChange('web')}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  mode === 'web'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                网页
              </button>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5">
              <svg
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-stone-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mode === 'bookmarks' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.25 5.25A2.25 2.25 0 0 1 7.5 3h9a2.25 2.25 0 0 1 2.25 2.25v15L12 16.5l-6.75 3.75v-15Z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.25 0 4.125-4.03 4.125-9S14.25 3 12 3m0 18c-2.25 0-4.125-4.03-4.125-9S9.75 3 12 3m-7.5 9h15" />
                )}
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder={mode === 'bookmarks' ? '搜索书签...' : `使用 ${selectedEngine.label} 搜索...`}
                value={value}
                onChange={handleChange}
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder-stone-400"
                aria-label={mode === 'bookmarks' ? '搜索书签' : '搜索网页'}
              />
              {mode === 'web' && (
                <select
                  value={searchEngine}
                  onChange={(e) => onSearchEngineChange(e.target.value as SearchEngineId)}
                  aria-label="搜索引擎"
                  className="hidden h-8 rounded-lg border border-stone-200 bg-stone-50 px-2 text-xs text-stone-600 outline-none transition-colors hover:border-stone-300 focus:border-stone-400 sm:block"
                >
                  {SEARCH_ENGINES.map((engine) => (
                    <option key={engine.id} value={engine.id}>
                      {engine.label}
                    </option>
                  ))}
                </select>
              )}
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="清空搜索"
                  className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              </div>
            </div>
            <div className="mt-1 flex min-h-5 items-center justify-between gap-3 rounded-lg bg-stone-50 px-2 py-1 text-[11px] text-stone-400">
              <span className="min-w-0 truncate">{hint}</span>
              <span className="hidden shrink-0 items-center gap-2 sm:flex">
                {mode === 'bookmarks' && value && resultCount !== undefined && resultCount > 1 && (
                  <span className="flex items-center gap-1">
                    <KeyHint>↑↓</KeyHint>
                    <span>选择</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <KeyHint>/</KeyHint>
                  <span>聚焦</span>
                </span>
                {primaryAction && (
                  <span className="flex items-center gap-1">
                    <KeyHint>Enter</KeyHint>
                    <span>{primaryAction}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <KeyHint>Ctrl K</KeyHint>
                  <span>切换模式</span>
                </span>
              </span>
            </div>
          </form>
          <SettingsButton onClick={onOpenSettings} className="hidden h-[68px] lg:flex" />
        </div>
        <div className="hidden rounded-lg bg-stone-100 p-0.5 lg:flex" role="tablist" aria-label="视图切换">
          <ViewButton active={viewMode === 'folder'} onClick={() => onViewModeChange('folder')}>
            全部
          </ViewButton>
          <ViewButton active={viewMode === 'frequent'} onClick={() => onViewModeChange('frequent')} disabled={historyCount === 0}>
            常用
          </ViewButton>
          <ViewButton active={viewMode === 'recent'} onClick={() => onViewModeChange('recent')} disabled={historyCount === 0}>
            最近
          </ViewButton>
        </div>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-white text-stone-900 shadow-sm'
          : 'text-stone-500 hover:text-stone-700'
      }`}
    >
      {children}
    </button>
  );
}

function KeyHint({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-stone-200 bg-white px-1.5 py-0.5 font-medium leading-none text-stone-500 shadow-sm">
      {children}
    </kbd>
  );
}

function SettingsButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="打开设置"
      className={`shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white px-3 text-stone-500 shadow-sm transition-colors hover:border-stone-300 hover:text-stone-800 ${className}`}
    >
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h4m4 0h8M4 17h8m4 0h4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 5v4m4 6v4" />
      </svg>
    </button>
  );
}
