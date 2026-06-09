import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../settings';

describe('normalizeSettings', () => {
  it('keeps valid settings', () => {
    expect(normalizeSettings({
      defaultSearchMode: 'web',
      searchEngine: 'bing',
      noResultWebSearch: false,
      bookmarkScope: 'nested',
      cardDensity: 'compact',
    })).toEqual({
      defaultSearchMode: 'web',
      searchEngine: 'bing',
      noResultWebSearch: false,
      bookmarkScope: 'nested',
      cardDensity: 'compact',
    });
  });

  it('falls back for invalid settings', () => {
    expect(normalizeSettings({
      defaultSearchMode: 'invalid',
      searchEngine: 'invalid',
      noResultWebSearch: 'yes',
      bookmarkScope: 'invalid',
      cardDensity: 'invalid',
    })).toEqual(DEFAULT_SETTINGS);
  });
});
