import type { BookmarkItem } from '../shared/types';

export type DeadLinkStatus = 'alive' | 'dead' | 'unknown';

export interface DeadLinkResult {
  bookmark: BookmarkItem;
  status: DeadLinkStatus;
  error?: string;
}

export interface DeadLinkDetectionProgress {
  total: number;
  checked: number;
  alive: number;
  dead: number;
  unknown: number;
}

export type DeadLinkDetectionCallback = (
  progress: DeadLinkDetectionProgress,
  results: DeadLinkResult[]
) => void;

const CHECK_TIMEOUT = 10000;
const CONCURRENCY = 5;

/**
 * 检测书签链接是否可访问。
 *
 * 使用 no-cors 模式发送请求，只检测网络层面是否可达：
 * - 请求成功（即使 opaque 响应）→ alive（服务器可达）
 * - 网络错误（DNS 失败、连接拒绝、跨域限制等）→ unknown
 * - 超时或其他错误 → unknown
 *
 * 限制：无法检测 404 等 HTTP 错误码（opaque 响应不暴露状态码）。
 */
export async function detectDeadLinks(
  bookmarks: BookmarkItem[],
  onProgress: DeadLinkDetectionCallback,
  signal?: AbortSignal
): Promise<DeadLinkResult[]> {
  const results: DeadLinkResult[] = [];
  let alive = 0;
  let dead = 0;
  let unknown = 0;

  const queue = [...bookmarks];
  const running = new Set<Promise<void>>();

  async function checkNext(): Promise<void> {
    if (signal?.aborted) return;
    const bookmark = queue.shift();
    if (!bookmark) return;

    const result = await checkUrl(bookmark, signal);
    results.push(result);

    if (result.status === 'alive') alive++;
    else if (result.status === 'dead') dead++;
    else unknown++;

    onProgress(
      { total: bookmarks.length, checked: results.length, alive, dead, unknown },
      results
    );
  }

  while ((!signal?.aborted && queue.length > 0) || running.size > 0) {
    while (!signal?.aborted && queue.length > 0 && running.size < CONCURRENCY) {
      const promise = checkNext().finally(() => running.delete(promise));
      running.add(promise);
    }
    if (running.size > 0) {
      await Promise.race(running);
    }
  }

  return results;
}

async function checkUrl(
  bookmark: BookmarkItem,
  signal?: AbortSignal
): Promise<DeadLinkResult> {
  if (!bookmark.url.startsWith('http://') && !bookmark.url.startsWith('https://')) {
    return { bookmark, status: 'unknown', error: '非 HTTP 协议' };
  }

  try {
    await fetchWithTimeout(bookmark.url, CHECK_TIMEOUT, signal);
    // opaque response means the server is reachable
    return { bookmark, status: 'alive' };
  } catch (error) {
    if (signal?.aborted) {
      return { bookmark, status: 'unknown', error: '检测已取消' };
    }

    if (error instanceof TypeError) {
      return { bookmark, status: 'unknown', error: '无法确认连接' };
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      return { bookmark, status: 'unknown', error: '请求超时' };
    }

    return { bookmark, status: 'unknown', error: error instanceof Error ? error.message : '未知错误' };
  }
}

function fetchWithTimeout(
  url: string,
  timeout: number,
  signal?: AbortSignal
): Promise<Response> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return fetch(url, {
    method: 'HEAD',
    mode: 'no-cors',
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}
