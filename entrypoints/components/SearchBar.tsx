import { useState, useCallback, useRef, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  resultCount?: number;
  title: string;
  subtitle: string;
  totalCount: number;
  onOpenSidebar: () => void;
}

export function SearchBar({ onSearch, resultCount, title, subtitle, totalCount, onOpenSidebar }: SearchBarProps) {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

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
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSearch]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setValue(q);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(q), 200);
    },
    [onSearch]
  );

  return (
    <div className="sticky top-0 z-10 border-b border-stone-200 bg-[#F6F5F3]/95 px-4 py-4 backdrop-blur md:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open folders"
            className="rounded-lg border border-stone-200 bg-white p-2 text-stone-500 shadow-sm transition-colors hover:border-stone-300 hover:text-stone-800 md:hidden"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-stone-900">{title}</h1>
              <span className="hidden rounded-full bg-white px-2 py-1 text-xs text-stone-500 shadow-sm ring-1 ring-stone-200 sm:inline">
                {totalCount}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-stone-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex h-12 w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 shadow-sm transition-all focus-within:border-stone-400 focus-within:shadow-md lg:max-w-xl">
          <svg
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search bookmarks..."
            value={value}
            onChange={handleChange}
            className="min-w-0 flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder-stone-400"
            aria-label="Search bookmarks"
          />
          {value ? (
            <div className="flex shrink-0 items-center gap-2">
              {resultCount !== undefined && (
                <span className="hidden text-xs text-stone-400 sm:inline">{resultCount} results</span>
              )}
              <button
                type="button"
                onClick={() => {
                  setValue('');
                  clearTimeout(timerRef.current);
                  onSearch('');
                }}
                aria-label="Clear search"
                className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <kbd className="hidden shrink-0 rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-400 sm:inline-block">
              /
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}
