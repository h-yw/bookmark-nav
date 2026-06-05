import { useEffect, useRef, useState } from 'react';
import type { BookmarkItem } from './types';
import { getFaviconUrl, getDuckDuckGoFaviconUrl } from './favicon';
import type { CardDensity } from './settings';
import { simplifyUrl, openUrl } from './utils';

export type BookmarkCardAction = 'copy' | 'edit' | 'delete';

interface BookmarkCardProps {
  bookmark: BookmarkItem;
  showFolderPath?: boolean;
  density?: CardDensity;
  selected?: boolean;
  onOpen?: (bookmark: BookmarkItem) => void;
  onAction?: (action: BookmarkCardAction, bookmark: BookmarkItem) => void;
}

function getFolderLabel(folderPath: string[]): string {
  return folderPath.length > 0 ? folderPath.join(' / ') : '全部书签';
}

function FallbackIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9 9 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

export function BookmarkCard({
  bookmark,
  showFolderPath = false,
  density = 'comfortable',
  selected = false,
  onOpen,
  onAction,
}: BookmarkCardProps) {
  const [imgError, setImgError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const favicon = useFallback ? getDuckDuckGoFaviconUrl(bookmark.url) : getFaviconUrl(bookmark.url);
  const compact = density === 'compact';

  useEffect(() => {
    setImgError(false);
    setUseFallback(false);
    setImageReady(false);
    setMenuOpen(false);
  }, [bookmark.url]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen]);

  const handleClick = () => {
    if (onOpen) {
      onOpen(bookmark);
      return;
    }
    openUrl(bookmark.url);
  };

  const handleAction = (action: BookmarkCardAction) => {
    setMenuOpen(false);
    onAction?.(action, bookmark);
  };

  return (
    <div
      title={`${bookmark.title}\n${bookmark.url}`}
      className={`group relative flex w-full flex-col rounded-lg border bg-white text-left shadow-sm transition-all hover:border-stone-300 hover:shadow-md ${
        selected ? 'border-stone-400 ring-2 ring-stone-300/70' : 'border-stone-200'
      } ${
        compact ? 'p-2.5' : 'p-3'
      }`}
    >
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full min-w-0 cursor-pointer items-start gap-2.5 text-left focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-stone-300/70"
      >
        <div className={`flex shrink-0 items-center justify-center rounded-lg border transition-colors ${
          imageReady && !imgError ? 'border-transparent bg-white' : 'border-stone-200 bg-stone-50'
        } ${compact ? 'h-8 w-8' : 'h-9 w-9'}`}>
          {favicon && !imgError ? (
            <img
              src={favicon}
              alt=""
              className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}
              onLoad={() => setImageReady(true)}
              onError={() => {
                if (!useFallback) {
                  setUseFallback(true);
                  setImageReady(false);
                } else {
                  setImgError(true);
                  setImageReady(false);
                }
              }}
            />
          ) : (
            <FallbackIcon />
          )}
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <div className={`line-clamp-2 font-medium text-stone-800 transition-colors group-hover:text-stone-950 ${
            compact ? 'h-9 text-xs leading-[18px]' : 'h-10 text-sm leading-5'
          }`}>
            {bookmark.title}
          </div>
          <div className="mt-1 h-4 truncate text-xs leading-4 text-stone-400">
            {simplifyUrl(bookmark.url)}
          </div>
        </div>
      </button>

      {onAction && (
        <div ref={menuRef} className="absolute right-2 top-2">
          <button
            type="button"
            aria-label="打开书签操作菜单"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 opacity-100 transition-colors hover:bg-stone-100 hover:text-stone-700 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300/70 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.75h.008v.008H12V6.75Zm0 5.25h.008v.008H12V12Zm0 5.25h.008v.008H12v-.008Z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-32 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
              <MenuItem onClick={() => handleAction('copy')}>复制链接</MenuItem>
              <MenuItem onClick={() => handleAction('edit')}>编辑</MenuItem>
              <MenuItem danger onClick={() => handleAction('delete')}>删除</MenuItem>
            </div>
          )}
        </div>
      )}

      {showFolderPath && (
        <div className={`${compact ? 'mt-2' : 'mt-3'} flex max-w-full items-center gap-1 rounded-md border border-stone-100 bg-stone-50 px-2 py-1 text-[11px] leading-4 text-stone-400`}>
          <svg aria-hidden="true" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6.75h6l1.5 1.5h9A1.5 1.5 0 0 1 21.75 9.75v7.5a1.5 1.5 0 0 1-1.5 1.5H3.75A1.5 1.5 0 0 1 2.25 17.25v-9a1.5 1.5 0 0 1 1.5-1.5Z" />
          </svg>
          <span className="truncate">{getFolderLabel(bookmark.folderPath)}</span>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  danger = false,
  onClick,
  children,
}: {
  danger?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
      }`}
    >
      {children}
    </button>
  );
}
