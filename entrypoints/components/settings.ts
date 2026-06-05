export type SearchEngineId = 'google' | 'bing' | 'duckduckgo' | 'baidu';
export type SearchMode = 'bookmarks' | 'web';
export type BookmarkScope = 'direct' | 'nested';
export type CardDensity = 'comfortable' | 'compact';

export interface AppSettings {
  defaultSearchMode: SearchMode;
  searchEngine: SearchEngineId;
  noResultWebSearch: boolean;
  bookmarkScope: BookmarkScope;
  cardDensity: CardDensity;
}

export interface SearchEngine {
  id: SearchEngineId;
  label: string;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'google', label: 'Google' },
  { id: 'bing', label: 'Bing' },
  { id: 'duckduckgo', label: 'DuckDuckGo' },
  { id: 'baidu', label: '百度' },
];

export const SETTINGS_STORAGE_KEY = 'bookmark-nav.settings';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultSearchMode: 'bookmarks',
  searchEngine: 'google',
  noResultWebSearch: true,
  bookmarkScope: 'direct',
  cardDensity: 'comfortable',
};

function isSearchMode(value: unknown): value is SearchMode {
  return value === 'bookmarks' || value === 'web';
}

function isSearchEngineId(value: unknown): value is SearchEngineId {
  return value === 'google' || value === 'bing' || value === 'duckduckgo' || value === 'baidu';
}

function isBookmarkScope(value: unknown): value is BookmarkScope {
  return value === 'direct' || value === 'nested';
}

function isCardDensity(value: unknown): value is CardDensity {
  return value === 'comfortable' || value === 'compact';
}

export function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
  const input = value as Partial<AppSettings>;

  return {
    defaultSearchMode: isSearchMode(input.defaultSearchMode)
      ? input.defaultSearchMode
      : DEFAULT_SETTINGS.defaultSearchMode,
    searchEngine: isSearchEngineId(input.searchEngine)
      ? input.searchEngine
      : DEFAULT_SETTINGS.searchEngine,
    noResultWebSearch:
      typeof input.noResultWebSearch === 'boolean'
        ? input.noResultWebSearch
        : DEFAULT_SETTINGS.noResultWebSearch,
    bookmarkScope: isBookmarkScope(input.bookmarkScope)
      ? input.bookmarkScope
      : DEFAULT_SETTINGS.bookmarkScope,
    cardDensity: isCardDensity(input.cardDensity)
      ? input.cardDensity
      : DEFAULT_SETTINGS.cardDensity,
  };
}

export function loadSettings(): AppSettings {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? 'null'));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 设置仍会在当前会话中生效。
  }
}
