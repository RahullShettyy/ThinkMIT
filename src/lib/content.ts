import { unstable_cache } from 'next/cache';
import rawData from '@data';
import { getSupabaseServerClient } from './supabase-server';

const defaultSiteData = ((rawData as { default?: unknown }).default || rawData) as typeof rawData;
export type SiteContent = typeof defaultSiteData;

function isPlainObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Deep fills keys from defaultVal into overrideVal.
 * Arrays from overrideVal are taken as-is per PRD §6.1.
 * Recursive for objects.
 */
export function deepFill<T>(defaultVal: T, overrideVal: unknown): T {
  if (overrideVal === undefined || overrideVal === null) {
    return defaultVal;
  }

  if (Array.isArray(defaultVal)) {
    return Array.isArray(overrideVal) ? (overrideVal as unknown as T) : defaultVal;
  }

  if (isPlainObject(defaultVal)) {
    if (!isPlainObject(overrideVal)) {
      return defaultVal;
    }

    const result: Record<string, unknown> = { ...overrideVal };

    for (const key of Object.keys(defaultVal)) {
      if (!(key in overrideVal) || overrideVal[key] === undefined) {
        result[key] = (defaultVal as Record<string, unknown>)[key];
      } else {
        result[key] = deepFill(
          (defaultVal as Record<string, unknown>)[key],
          overrideVal[key]
        );
      }
    }

    return result as unknown as T;
  }

  return overrideVal as unknown as T;
}

let memoryCache: { data: SiteContent; expiry: number } | null = null;
let lastFailureTimestamp = 0;
const FAILURE_BACKOFF_MS = 20_000; // 20s backoff if connection fails or times out

async function fetchMergedContent(): Promise<SiteContent> {
  const now = Date.now();

  // If in dev and we recently failed to connect to Supabase, avoid stalling the server
  if (process.env.NODE_ENV === 'development' && now - lastFailureTimestamp < FAILURE_BACKOFF_MS) {
    return defaultSiteData as SiteContent;
  }

  // If cached in memory and still valid, return immediately (fast 0ms response)
  if (memoryCache && now < memoryCache.expiry) {
    return memoryCache.data;
  }

  // Always start with a shallow copy of sections from data.js
  const defaultSections = defaultSiteData as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...defaultSections };

  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return defaultSiteData as SiteContent;
    }

    // Wrap query in 2s timeout race
    const fetchPromise = supabase.from('site_content').select('section, value');
    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase query timed out (2s)')), 2000)
    );

    const { data: rows, error } = (await Promise.race([fetchPromise, timeoutPromise])) as {
      data: Array<{ section: string; value: unknown }> | null;
      error: unknown;
    };

    if (error || !rows) {
      return defaultSiteData as SiteContent;
    }

    for (const row of rows) {
      const section = row.section;
      if (section in defaultSections) {
        merged[section] = deepFill(defaultSections[section], row.value);
      } else {
        merged[section] = row.value;
      }
    }

    const finalContent = merged as unknown as SiteContent;
    memoryCache = { data: finalContent, expiry: now + 30_000 }; // 30s in-memory cache
    return finalContent;
  } catch (err) {
    lastFailureTimestamp = Date.now();
    // Graceful fallback to data.js on timeout or network drop
    return defaultSiteData as SiteContent;
  }
}

const cachedGetContent = unstable_cache(
  async (): Promise<SiteContent> => {
    return fetchMergedContent();
  },
  ['site-content'],
  { tags: ['site-content'] }
);

export const getContent = async (): Promise<SiteContent> => {
  if (process.env.NODE_ENV === 'development') {
    return fetchMergedContent();
  }
  return cachedGetContent();
};

export default getContent;
