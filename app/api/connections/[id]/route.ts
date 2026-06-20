import { isStatus } from "@/lib/connection";
import {
  authFail,
  requireAdmin,
  requireMember,
  requireUser,
} from "@/lib/server/auth";
import { fail, ok, readJson } from "@/lib/server/http";
import { rowToConnection, rowToNote } from "@/lib/server/serialize";
import { emailsByUserId } from "@/lib/server/users";
import { createServiceClient } from "@/lib/supabase/service";

const CONNECTION_COLS =
  "id, church_id, name, email, phone, visitor_type, interests, message, status, assigned_to, source, created_at, updated_at";

async function connectionChurch(id: string): Promise<{ churchId: string; status: string } | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("connection")
    .select("church_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return { churchId: data.church_id as string, status: data.status as string };
}

// Card detail + its follow-up notes.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const ctx = await connectionChurch(id);
    if (!ctx) return fail(404, "connection_not_found");
    await requireMember(user.id, ctx.churchId);

    const db = createServiceClient();
    const [{ data: conn }, { data: notes }] = await Promise.all([
      db.from("connection").select(CONNECTION_COLS).eq("id", id).single(),
      db
        .from("note")
        .select("id, connection_id, author_id, body, created_at")
        .eq("connection_id", id)
        .order("created_at", { ascending: true }),
    ]);
    if (!conn) return fail(404, "connection_not_found");

    const emails = await emailsByUserId([
      conn.assigned_to as string,
      ...(notes ?? []).map((n) => n.author_id as string),
    ]);

    return ok({
      connection: rowToConnection(conn, emails),
      notes: (notes ?? []).map((n) => rowToNote(n, emails)),
    });
  } catch (err) {
    return authFail(err) ?? Promise.reject(err);
  }
}

// Update status and/or assignee. Any member may work a card.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const ctx = await connectionChurch(id);
    if (!ctx) return fail(404, "connection_not_found");
    await requireMember(user.id, ctx.churchId);

    const body = await readJson<{ status?: string; assignedTo?: string | null }>(req);
    if (!body) return fail(400, "missing_fields");

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.status !== undefined) {
      if (!isStatus(body.status)) return fail(400, "invalid_status");
      patch.status = body.status;
    }

    if (body.assignedTo !== undefined) {
      if (body.assignedTo === null) {
        patch.assigned_to = null;
      } else {
        // The assignee must be a member of this church.
        const db0 = createServiceClient();
        const { data: m } = await db0
          .from("member")
          .select("user_id")
          .eq("church_id", ctx.churchId)
          .eq("user_id", body.assignedTo)
          .maybeSingle();
        if (!m) return fail(400, "invalid_assignee");
        patch.assigned_to = body.assignedTo;
        // Picking up a brand-new card moves it to "assigned" unless the caller
        // set a status explicitly.
        if (body.status === undefined && ctx.status === "new") patch.status = "assigned";
      }
    }

    const db = createServiceClient();
    const { error } = await db.from("connection").update(patch).eq("id", id);
    if (error) return fail(400, "invalid_update");
    return ok({});
  } catch (err) {
    return authFail(err) ?? Promise.reject(err);
  }
}

// Permanent delete (GDPR erasure) — admin only; members archive instead.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const ctx = await connectionChurch(id);
    if (!ctx) return fail(404, "connection_not_found");
    await requireAdmin(user.id, ctx.churchId);

    const db = createServiceClient();
    const { error } = await db.from("connection").delete().eq("id", id);
    if (error) return fail(500, "internal");
    return ok({});
  } catch (err) {
    return authFail(err) ?? Promise.reject(err);
  }
}
