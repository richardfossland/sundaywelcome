import { DEFAULT_INTERESTS } from "@/lib/connection";
import { authFail, requireAdmin, requireMember, requireUser } from "@/lib/server/auth";
import { fail, ok, readJson } from "@/lib/server/http";
import { createServiceClient } from "@/lib/supabase/service";
import type { Interest, WelcomeSettings } from "@/lib/types";

const SETTINGS_COLS =
  "church_id, form_enabled, headline, intro, ask_phone, ask_visitor_type, interests, thank_you, updated_at";

function rowToSettings(churchId: string, row: Record<string, unknown> | null): WelcomeSettings {
  return {
    churchId,
    formEnabled: (row?.form_enabled as boolean) ?? true,
    headline: (row?.headline as string) ?? "Velkommen!",
    intro:
      (row?.intro as string) ??
      "Så fint at du er her. Legg igjen navnet ditt, så tar vi kontakt.",
    askPhone: (row?.ask_phone as boolean) ?? true,
    askVisitorType: (row?.ask_visitor_type as boolean) ?? true,
    interests: ((row?.interests as Interest[] | null) ?? DEFAULT_INTERESTS),
    thankYou: (row?.thank_you as string) ?? "Takk! Vi tar kontakt med deg snart.",
    updatedAt: (row?.updated_at as string) ?? "",
  };
}

/** Keep only well-formed {key,label} interest entries (defensive against the
 * client sending junk into a jsonb column). */
function cleanInterests(raw: unknown): Interest[] {
  if (!Array.isArray(raw)) return DEFAULT_INTERESTS;
  const seen = new Set<string>();
  const out: Interest[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const key = String((item as Interest).key ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    const label = String((item as Interest).label ?? "").trim().slice(0, 80);
    if (!key || !label || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, label });
    if (out.length >= 12) break;
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const churchId = new URL(req.url).searchParams.get("churchId");
    if (!churchId) return fail(400, "missing_fields");
    await requireMember(user.id, churchId);

    const db = createServiceClient();
    const { data } = await db
      .from("settings")
      .select(SETTINGS_COLS)
      .eq("church_id", churchId)
      .maybeSingle();
    return ok({ settings: rowToSettings(churchId, data) });
  } catch (err) {
    return authFail(err) ?? Promise.reject(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{
      churchId?: string;
      formEnabled?: boolean;
      headline?: string;
      intro?: string;
      askPhone?: boolean;
      askVisitorType?: boolean;
      interests?: unknown;
      thankYou?: string;
    }>(req);
    if (!body?.churchId) return fail(400, "missing_fields");
    await requireAdmin(user.id, body.churchId);

    const patch: Record<string, unknown> = {
      church_id: body.churchId,
      updated_at: new Date().toISOString(),
    };
    if (body.formEnabled !== undefined) patch.form_enabled = body.formEnabled;
    if (body.headline !== undefined) patch.headline = body.headline.trim().slice(0, 120) || "Velkommen!";
    if (body.intro !== undefined) patch.intro = body.intro.trim().slice(0, 1000);
    if (body.askPhone !== undefined) patch.ask_phone = body.askPhone;
    if (body.askVisitorType !== undefined) patch.ask_visitor_type = body.askVisitorType;
    if (body.interests !== undefined) patch.interests = cleanInterests(body.interests);
    if (body.thankYou !== undefined) patch.thank_you = body.thankYou.trim().slice(0, 1000);

    const db = createServiceClient();
    const { error } = await db.from("settings").upsert(patch);
    if (error) return fail(400, "invalid_settings");
    return ok({});
  } catch (err) {
    return authFail(err) ?? Promise.reject(err);
  }
}
