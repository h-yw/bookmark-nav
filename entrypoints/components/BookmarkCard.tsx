import { useEffect, useState } from 'react';
import type { BookmarkItem } from './types';
import { getFaviconUrl } from './favicon';
import type { CardDensity, FaviconSource } from './settings';

interface BookmarkCardProps {
  bookmark: BookmarkItem;
  showFolderPath?: boolean;
  density?: CardDensity;
  faviconSource?: FaviconSource;
  selected?: boolean;
  onOpen?: (bookmark: BookmarkItem) => void;
}

function simplifyUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
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
  faviconSource = 'site',
  selected = false,
  onOpen,
}: BookmarkCardProps) {
  const favicon = getFaviconUrl(bookmark.url, faviconSource);
  const [imgError, setImgError] = useState(false);
  const compact = density === 'compact';

  useEffect(() => {
    setImgError(false);
  }, [favicon]);

  const handleClick = () => {
    if (onOpen) {
      onOpen(bookmark);
      return;
    }
    try {
      chrome.tabs.update({ url: bookmark.url });
    } catch {
      window.open(bookmark.url, '_blank');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`${bookmark.title}\n${bookmark.url}`}
      className={`group flex w-full cursor-pointer flex-col rounded-lg border bg-white text-left shadow-sm transition-all hover:translate-y-[-1px] hover:border-stone-300 hover:shadow-md focus:outline-none focus-visible:border-stone-400 focus-visible:ring-2 focus-visible:ring-stone-300/70 ${
        selected ? 'border-stone-400 ring-2 ring-stone-300/70' : 'border-stone-200'
      } ${
        compact ? 'p-2.5' : 'p-3'
      }`}
    >
      <div className="flex w-full min-w-0 items-start gap-2.5">
        <div className={`flex shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 ${compact ? 'h-8 w-8' : 'h-9 w-9'}`}>
          {favicon && !imgError ? (
            <img
              src={favicon}
              alt=""
              className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}
              onError={() => setImgError(true)}
            />
          ) : (
            <FallbackIcon />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`line-clamp-2 font-medium text-stone-800 transition-colors group-hover:text-stone-950 ${
            compact ? 'h-9 text-xs leading-[18px]' : 'h-10 text-sm leading-5'
          }`}>
            {bookmark.title}
          </div>
          <div className="mt-1 h-4 truncate text-xs leading-4 text-stone-400">
            {simplifyUrl(bookmark.url)}
          </div>
        </div>
      </div>
      {showFolderPath && (
        <div className={`${compact ? 'mt-2' : 'mt-3'} flex max-w-full items-center gap-1 rounded-md border border-stone-100 bg-stone-50 px-2 py-1 text-[11px] leading-4 text-stone-400`}>
          <svg aria-hidden="true" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6.75h6l1.5 1.5h9A1.5 1.5 0 0 1 21.75 9.75v7.5a1.5 1.5 0 0 1-1.5 1.5H3.75A1.5 1.5 0 0 1 2.25 17.25v-9a1.5 1.5 0 0 1 1.5-1.5Z" />
          </svg>
          <span className="truncate">{getFolderLabel(bookmark.folderPath)}</span>
        </div>
      )}
    </button>
  );
}
