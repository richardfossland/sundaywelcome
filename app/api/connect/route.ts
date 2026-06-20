import { DEFAULT_INTERESTS, validateConnection } from "@/lib/connection";
import { clientIp, fail, ok, rateLimit, readJson } from "@/lib/server/http";
import {
  createPublicServiceClient,
  createServiceClient,
} from "@/lib/supabase/service";
import type { ConnectInput, Interest } from "@/lib/types";

// PUBLIC + unauthenticated: a newcomer submits the connect card from
// /velkommen/[slug]. No anon DB access — we resolve the church, validate, and
// insert via the service role. Whitelisted in middleware.
export async function POST(req: Request) {
  try {
    // Lenient per-IP cap: a foyer full of phones shares one church-wifi IP, so
    // we only want to stop scripted abuse, not a family signing up together.
    if (!rateLimit(`connect:${clientIp(req)}`, 30, 10 * 60 * 1000)) {
      return fail(429, "rate_limited");
    }

    const body = await readJson<ConnectInput>(req);
    const slug = body?.slug?.trim().toLowerCase();
    if (!slug) return fail(400, "church_not_found");

    // Resolve the tenant by slug (shared SundayPlan church table).
    const pub = createPublicServiceClient();
    const { data: church } = await pub
      .from("church")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!church) return fail(404, "church_not_found");
    const churchId = church.id as string;

    // Form config: settings is seeded on church creation, but fall back to
    // sensible defaults if a church somehow has no row yet.
    const db = createServiceClient();
    const { data: settings } = await db
      .from("settings")
      .select("form_enabled, interests")
      .eq("church_id", churchId)
      .maybeSingle();

    if (settings && settings.form_enabled === false) return fail(403, "form_disabled");

    const offered = ((settings?.interests as Interest[] | null) ?? DEFAULT_INTERESTS).map(
      (i) => i.key,
    );

    const result = validateConnection(body ?? { slug }, offered);
    if (!result.ok) return fail(400, result.error);

    const { error } = await db.from("connection").insert({
      church_id: churchId,
      ...result.value,
      source: "web",
    });
    if (error) {
      console.error("[connect] insert", error.message);
      return fail(500, "internal");
    }

    return ok({ ok: true });
  } catch (err) {
    // Never leak a raw 500 to the public form — return a clean JSON error.
    // The most likely cause in a fresh deploy is the missing
    // SUPABASE_SERVICE_ROLE_KEY Worker secret (createServiceClient throws).
    console.error("[connect]", err instanceof Error ? err.message : err);
    return fail(500, "internal");
  }
}
