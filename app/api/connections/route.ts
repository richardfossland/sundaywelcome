import { isStatus } from "@/lib/connection";
import { authFail, requireMember, requireUser } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/http";
import { rowToConnection } from "@/lib/server/serialize";
import { emailsByUserId } from "@/lib/server/users";
import { createServiceClient } from "@/lib/supabase/service";

// Inbox: list a church's newcomer cards, newest first, optionally filtered by
// status. Any member (admin or follower) of the church may read.
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const churchId = url.searchParams.get("churchId");
    if (!churchId) return fail(400, "missing_fields");
    await requireMember(user.id, churchId);

    const statusParam = url.searchParams.get("status");

    const db = createServiceClient();
    let q = db
      .from("connection")
      .select(
        "id, church_id, name, email, phone, visitor_type, interests, message, status, assigned_to, source, created_at, updated_at",
      )
      .eq("church_id", churchId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (statusParam && isStatus(statusParam)) q = q.eq("status", statusParam);

    const { data, error } = await q;
    if (error) return fail(500, "internal");

    const emails = await emailsByUserId((data ?? []).map((r) => r.assigned_to as string));
    const connections = (data ?? []).map((r) => rowToConnection(r, emails));

    // Open-card counts per status drive the inbox filter badges.
    const counts: Record<string, number> = {};
    for (const c of connections) counts[c.status] = (counts[c.status] ?? 0) + 1;

    return ok({ connections, counts });
  } catch (err) {
    return authFail(err) ?? Promise.reject(err);
  }
}
