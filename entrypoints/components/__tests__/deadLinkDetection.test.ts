import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BookmarkItem } from '../types';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
const { detectDeadLinks } = await import('../deadLinkDetection');

function makeBookmark(overrides: Partial<BookmarkItem> = {}): BookmarkItem {
  return {
    id: '1',
    title: 'Test Bookmark',
    url: 'https://example.com',
    folderPath: ['书签栏'],
    folderIdPath: ['1'],
    dateAdded: 1000,
    ...overrides,
  };
}

describe('detectDeadLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks accessible URLs as alive', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const bookmarks = [makeBookmark({ id: '1', url: 'https://example.com' })];
    const onProgress = vi.fn();

    const results = await detectDeadLinks(bookmarks, onProgress);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('alive');
    expect(onProgress).toHaveBeenCalled();
  });

  it('marks network errors as unknown', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const bookmarks = [makeBookmark({ id: '1', url: 'https://dead-domain.invalid' })];
    const onProgress = vi.fn();

    const results = await detectDeadLinks(bookmarks, onProgress);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('unknown');
    expect(results[0].error).toBe('无法确认连接');
  });

  it('marks timeouts as unknown', async () => {
    mockFetch.mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'));

    const bookmarks = [makeBookmark({ id: '1', url: 'https://slow-site.com' })];
    const onProgress = vi.fn();

    const results = await detectDeadLinks(bookmarks, onProgress);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('unknown');
    expect(results[0].error).toBe('请求超时');
  });

  it('skips non-http URLs', async () => {
    const bookmarks = [
      makeBookmark({ id: '1', url: 'chrome://settings' }),
      makeBookmark({ id: '2', url: 'javascript:void(0)' }),
    ];
    const onProgress = vi.fn();

    const results = await detectDeadLinks(bookmarks, onProgress);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('unknown');
    expect(results[0].error).toBe('非 HTTP 协议');
    expect(results[1].status).toBe('unknown');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('reports progress during detection', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const bookmarks = [
      makeBookmark({ id: '1', url: 'https://a.com' }),
      makeBookmark({ id: '2', url: 'https://b.com' }),
    ];
    const onProgress = vi.fn();

    await detectDeadLinks(bookmarks, onProgress);

    // Should have been called at least twice (once per bookmark)
    expect(onProgress.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Last call should have checked = 2
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall.checked).toBe(2);
    expect(lastCall.total).toBe(2);
  });

  it('does not start requests when already aborted', async () => {
    const bookmarks = [
      makeBookmark({ id: '1', url: 'https://a.com' }),
      makeBookmark({ id: '2', url: 'https://b.com' }),
    ];
    const onProgress = vi.fn();
    const controller = new AbortController();

    controller.abort();

    const results = await detectDeadLinks(bookmarks, onProgress, controller.signal);

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('stops scheduling new requests after abort', async () => {
    const controller = new AbortController();
    mockFetch.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
    });

    const bookmarks = [
      makeBookmark({ id: '1', url: 'https://a.com' }),
      makeBookmark({ id: '2', url: 'https://b.com' }),
      makeBookmark({ id: '3', url: 'https://c.com' }),
    ];
    const onProgress = vi.fn();

    const results = await detectDeadLinks(bookmarks, onProgress, controller.signal);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('unknown');
    expect(results[0].error).toBe('检测已取消');
  });
});
