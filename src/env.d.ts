/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_BASE_URL?: string;
  readonly OPENROUTER_DEFAULT_MODEL?: string;
  readonly OPENROUTER_TIMEOUT_MS?: string;
  readonly OPENROUTER_APP_NAME?: string;
  readonly OPENROUTER_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
