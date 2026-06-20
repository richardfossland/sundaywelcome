import { authFail, requireMember, requireUser } from "@/lib/server/auth";
import { fail, ok, readJson } from "@/lib/server/http";
import { createServiceClient } from "@/lib/supabase/service";

// Add a follow-up note to a card. Any member of the church may write one.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const db = createServiceClient();
    const { data: conn } = await db
      .from("connection")
      .select("church_id")
      .eq("id", id)
      .maybeSingle();
    if (!conn) return fail(404, "connection_not_found");
    const churchId = conn.church_id as string;
    await requireMember(user.id, churchId);

    const body = await readJson<{ body?: string }>(req);
    const text = body?.body?.trim();
    if (!text || text.length > 4000) return fail(400, "missing_fields");

    const { error } = await db.from("note").insert({
      connection_id: id,
      church_id: churchId,
      author_id: user.id,
      body: text,
    });
    if (error) return fail(500, "internal");
    return ok({});
  } catch (err) {
    return authFail(err) ?? Promise.reject(err);
  }
}
