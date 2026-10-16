"use client";

const MEMORY_CACHE = new Map<string, { timestamp: number; data: any }>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Retrieves cached data from browser sessionStorage or memory cache.
 */
export function getSessionCache<T = any>(key: string, maxAgeMs: number = DEFAULT_TTL): T | null {
  if (typeof window === "undefined") return null;

  try {
    // 1. Check memory cache first (fastest, 0ms)
    const mem = MEMORY_CACHE.get(key);
    if (mem && Date.now() - mem.timestamp < maxAgeMs) {
      return mem.data as T;
    }

    // 2. Check browser sessionStorage
    const raw = sessionStorage.getItem(`bzaa_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.timestamp === "number") {
        if (Date.now() - parsed.timestamp < maxAgeMs) {
          MEMORY_CACHE.set(key, { timestamp: parsed.timestamp, data: parsed.data });
          return parsed.data as T;
        } else {
          sessionStorage.removeItem(`bzaa_cache_${key}`);
        }
      }
    }
  } catch (e) {
    console.warn(`[sessionCache] Failed to read cache for key "${key}":`, e);
  }

  return null;
}

/**
 * Stores data into browser sessionStorage and memory cache.
 */
export function setSessionCache<T = any>(key: string, data: T): void {
  if (typeof window === "undefined") return;

  try {
    const payload = { timestamp: Date.now(), data };
    MEMORY_CACHE.set(key, payload);
    sessionStorage.setItem(`bzaa_cache_${key}`, JSON.stringify(payload));
  } catch (e) {
    // Storage quota exceeded or disabled
    console.warn(`[sessionCache] Failed to write cache for key "${key}":`, e);
  }
}

/**
 * Clears specific or all session cache entries.
 */
export function invalidateSessionCache(keyPrefix?: string): void {
  if (typeof window === "undefined") return;

  try {
    if (!keyPrefix) {
      MEMORY_CACHE.clear();
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith("bzaa_cache_")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } else {
      const fullPrefix = `bzaa_cache_${keyPrefix}`;
      for (const k of Array.from(MEMORY_CACHE.keys())) {
        if (k.startsWith(keyPrefix)) {
          MEMORY_CACHE.delete(k);
        }
      }
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && (k === fullPrefix || k.startsWith(fullPrefix))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch (e) {
    console.warn(`[sessionCache] Failed to invalidate cache for prefix "${keyPrefix}":`, e);
  }
}
