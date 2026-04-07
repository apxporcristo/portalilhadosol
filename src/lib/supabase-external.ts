import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase as cloudSupabase } from '@/integrations/supabase/client';

const LOCAL_CONFIG_KEY = 'voucher_supabase_config';

let cachedExternalClient: SupabaseClient | null = null;
let cachedConfig: { url: string; anonKey: string } | null = null;
let configPromise: Promise<{ url: string; anonKey: string } | null> | null = null;

function parseExternalConfig(value: unknown): { url: string; anonKey: string } | null {
  if (!value) return null;

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const url = (parsed as any)?.supabase_url || (parsed as any)?.url;
    const anonKey = (parsed as any)?.supabase_anon_key || (parsed as any)?.anonKey;

    if (!url || !anonKey) return null;
    return { url, anonKey };
  } catch {
    return null;
  }
}

function readLocalConfig(): { url: string; anonKey: string } | null {
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    return parseExternalConfig(raw);
  } catch {
    return null;
  }
}

function persistLocalConfig(config: { url: string; anonKey: string }) {
  try {
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify({
      supabase_url: config.url,
      supabase_anon_key: config.anonKey,
    }));
  } catch {
    // ignore localStorage failures
  }
}

async function loadExternalConfig(): Promise<{ url: string; anonKey: string } | null> {
  if (cachedConfig) return cachedConfig;

  const localConfig = readLocalConfig();
  if (localConfig) {
    cachedConfig = localConfig;
    return cachedConfig;
  }

  const { data, error } = await (cloudSupabase
    .from('app_settings' as any)
    .select('key, value')
    .eq('key', 'default')
    .maybeSingle() as any);

  if (error || !data?.value) return null;

  const parsedConfig = parseExternalConfig(data.value);
  if (!parsedConfig) return null;

  cachedConfig = parsedConfig;
  persistLocalConfig(parsedConfig);
  return cachedConfig;
}

export function setExternalConfig(url: string, anonKey: string) {
  cachedConfig = { url, anonKey };
  configPromise = Promise.resolve(cachedConfig);
  cachedExternalClient = createClient(url, anonKey, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'external-auth-token',
    },
  });
  persistLocalConfig(cachedConfig);
}

export function clearExternalConfig() {
  try {
    localStorage.removeItem(LOCAL_CONFIG_KEY);
  } catch {
    // ignore localStorage failures
  }

  cachedExternalClient = null;
  cachedConfig = null;
  configPromise = null;
}

function getConfigPromise() {
  if (!configPromise) {
    configPromise = loadExternalConfig()
      .then((config) => {
        // Do not cache null forever; allow retry on next call
        if (!config) {
          configPromise = null;
        }
        return config;
      })
      .catch((err) => {
        configPromise = null;
        throw err;
      });
  }
  return configPromise;
}

/**
 * Returns the external Supabase client for AUTH operations.
 * Falls back to Lovable Cloud client if external config is not set.
 */
export async function getAuthClient(): Promise<SupabaseClient> {
  const config = await getConfigPromise();
  if (!config) return cloudSupabase;

  if (!cachedExternalClient) {
    cachedExternalClient = createClient(config.url, config.anonKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'external-auth-token',
      },
    });
  }

  return cachedExternalClient;
}

/**
 * Returns the external Supabase client for DATA operations (same client).
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  return getAuthClient();
}

/**
 * Returns the resolved Supabase URL and anon key.
 */
export async function getSupabaseConfig(): Promise<{ url: string; anonKey: string }> {
  const config = await getConfigPromise();
  if (config) return config;
  // Fallback to cloud client hardcoded values
  return {
    url: 'https://tuchlxzgsgsgeiqmclcq.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1Y2hseHpnc2dzZ2VpcW1jbGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjY1NDcsImV4cCI6MjA4NTMwMjU0N30.qXDxKb8JosOV4gQj-bd6GmAAT5NciwYToFYG9fhhfds',
  };
}

/**
 * Resets cached client (useful when config changes).
 */
export function resetExternalClient() {
  cachedExternalClient = null;
  cachedConfig = null;
  configPromise = null;
}
