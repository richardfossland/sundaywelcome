import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Service-role auth-admin client (resolves + invites users; never bundled to
 * the client thanks to `server-only`). */
export function adminAuthClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Resolve auth emails for a set of user ids (assignees, note authors). */
export async function emailsByUserId(
  ids: Array<string | null | undefined>,
): Promise<Map<string, string | null>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (unique.length === 0) return new Map();
  const auth = adminAuthClient();
  const entries = await Promise.all(
    unique.map(async (id) => {
      const { data } = await auth.auth.admin.getUserById(id);
      return [id, data?.user?.email ?? null] as const;
    }),
  );
  return new Map(entries);
}
