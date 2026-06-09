import type { DeadLinkDetectionProgress, DeadLinkResult, DeadLinkStatus } from '../domain/deadLinkDetection';

export interface DeadLinkDetectionRecordItem {
  bookmarkId: string;
  title: string;
  url: string;
  status: DeadLinkStatus;
  error?: string;
}

export interface DeadLinkDetectionRecord {
  id: string;
  createdAt: number;
  total: number;
  alive: number;
  dead: number;
  unknown: number;
  results: DeadLinkDetectionRecordItem[];
}

const DEAD_LINK_RECORD_STORAGE_KEY = 'bookmark-nav.dead-link-record';

export function createDeadLinkDetectionRecord(
  progress: DeadLinkDetectionProgress,
  results: DeadLinkResult[],
  createdAt = Date.now()
): DeadLinkDetectionRecord {
  return {
    id: `${createdAt}`,
    createdAt,
    total: progress.total,
    alive: progress.alive,
    dead: progress.dead,
    unknown: progress.unknown,
    results: results.map((result) => ({
      bookmarkId: result.bookmark.id,
      title: result.bookmark.title,
      url: result.bookmark.url,
      status: result.status,
      ...(result.error ? { error: result.error } : {}),
    })),
  };
}

export function normalizeDeadLinkDetectionRecord(value: unknown): DeadLinkDetectionRecord | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as DeadLinkDetectionRecord;
  if (
    typeof record.id !== 'string' ||
    typeof record.createdAt !== 'number' ||
    typeof record.total !== 'number' ||
    typeof record.alive !== 'number' ||
    typeof record.dead !== 'number' ||
    typeof record.unknown !== 'number' ||
    !Array.isArray(record.results) ||
    !record.results.every(isDeadLinkDetectionRecordItem)
  ) {
    return null;
  }

  return {
    id: record.id,
    createdAt: record.createdAt,
    total: record.total,
    alive: record.alive,
    dead: record.dead,
    unknown: record.unknown,
    results: record.results.map((item) => ({ ...item })),
  };
}

export function loadDeadLinkDetectionRecord(): DeadLinkDetectionRecord | null {
  try {
    return normalizeDeadLinkDetectionRecord(
      JSON.parse(localStorage.getItem(DEAD_LINK_RECORD_STORAGE_KEY) ?? 'null')
    );
  } catch {
    return null;
  }
}

export function saveDeadLinkDetectionRecord(record: DeadLinkDetectionRecord | null): void {
  try {
    if (!record) {
      localStorage.removeItem(DEAD_LINK_RECORD_STORAGE_KEY);
      return;
    }
    localStorage.setItem(DEAD_LINK_RECORD_STORAGE_KEY, JSON.stringify(normalizeDeadLinkDetectionRecord(record)));
  } catch {
    // Detection records are informational and should not block detection flow.
  }
}

export function clearDeadLinkDetectionRecord(): void {
  saveDeadLinkDetectionRecord(null);
}

function isDeadLinkDetectionRecordItem(value: unknown): value is DeadLinkDetectionRecordItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as DeadLinkDetectionRecordItem;
  return (
    typeof item.bookmarkId === 'string' &&
    typeof item.title === 'string' &&
    typeof item.url === 'string' &&
    (item.status === 'alive' || item.status === 'dead' || item.status === 'unknown') &&
    (item.error === undefined || typeof item.error === 'string')
  );
}
