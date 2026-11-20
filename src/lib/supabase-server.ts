import { createClient } from '@supabase/supabase-js';

const SUPABASE_TIMEOUT_MS = 2500; // 2.5 seconds timeout to avoid SSR stalls

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
        if (options.signal) {
          options.signal.addEventListener('abort', () => controller.abort());
        }
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timer);
        });
      },
    },
  });
}

