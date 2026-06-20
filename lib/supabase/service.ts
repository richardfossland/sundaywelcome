import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function makeClient(schema: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema },
  });
}

/** Service-role client defaulting to the dedicated `welcome` schema — SERVER
 * ONLY. Bypasses RLS; the `server-only` guard keeps it out of client bundles.
 * Every read/write (including the public connect form) goes through this. */
export function createServiceClient() {
  return makeClient("welcome");
}

/** Service-role client against `public` — for the shared SundayPlan tenancy
 * tables (church, church_member) that SundayWelcome reuses instead of owning. */
export function createPublicServiceClient() {
  return makeClient("public");
}
