"use client";

import { getSessionCache, setSessionCache } from "./sessionCache";

interface ProgressiveBatchOptions<T> {
  endpoint: string;
  startPage?: number;
  pageSize?: number;
  cacheCompletedKey: string;
  onBatch: (newItems: T[]) => void;
  extractItems?: (data: any) => { items: T[]; hasMore: boolean };
}

/**
 * Progressively fetches data in parallel batches of 2 requests (15-20 items per batch)
 * in the background after initial render.
 * 
 * Once all batches are loaded, sets cacheCompletedKey in sessionStorage so that 
 * subsequent tab switches or returns do not trigger loading again.
 */
export async function runProgressiveParallelBatches<T>({
  endpoint,
  startPage = 2,
  pageSize = 20,
  cacheCompletedKey,
  onBatch,
  extractItems,
}: ProgressiveBatchOptions<T>): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. If already completely loaded in this browser session, skip entirely!
  const isCompleted = getSessionCache<boolean>(cacheCompletedKey);
  if (isCompleted) {
    return;
  }

  const defaultExtract = (data: any): { items: T[]; hasMore: boolean } => {
    if (!data) return { items: [], hasMore: false };
    if (Array.isArray(data)) {
      return { items: data, hasMore: data.length >= pageSize };
    }
    const items = data.items || data.products || data.orders || data.unitBarcodes || [];
    const hasMore = typeof data.hasMore === "boolean" ? data.hasMore : items.length >= pageSize;
    return { items, hasMore };
  };

  const extractor = extractItems || defaultExtract;
  let currentPage = startPage;
  let keepGoing = true;

  const fetchSinglePage = async (page: number) => {
    try {
      const separator = endpoint.includes("?") ? "&" : "?";
      const url = `${endpoint}${separator}page=${page}&limit=${pageSize}`;
      const res = await fetch(url);
      if (!res.ok) return { items: [], hasMore: false };
      const data = await res.json();
      return extractor(data);
    } catch (e) {
      console.warn(`[progressiveBatch] Error fetching ${endpoint} page ${page}:`, e);
      return { items: [], hasMore: false };
    }
  };

  try {
    while (keepGoing) {
      const p1 = currentPage;
      const p2 = currentPage + 1;

      // Run 2 parallel batch requests
      const [batch1, batch2] = await Promise.all([
        fetchSinglePage(p1),
        fetchSinglePage(p2),
      ]);

      if (batch1.items.length > 0) {
        onBatch(batch1.items);
      }
      if (batch2.items.length > 0) {
        onBatch(batch2.items);
      }

      // If either batch is empty or hasMore is false, we reached the end of the collection
      if (!batch1.hasMore || batch1.items.length < pageSize || !batch2.hasMore || batch2.items.length < pageSize) {
        keepGoing = false;
      } else {
        currentPage += 2;
      }

      // Safety limit to prevent infinite loops (max 100 pages = 2000 items)
      if (currentPage > 100) {
        keepGoing = false;
      }
    }

    // Mark completed in session cache
    setSessionCache(cacheCompletedKey, true);
  } catch (err) {
    console.warn(`[progressiveBatch] Batch fetching interrupted for ${endpoint}:`, err);
  }
}
