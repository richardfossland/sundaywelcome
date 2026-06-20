import {
  authFail,
  requireAdmin,
  requireMember,
  requireUser,
} from "@/lib/server/auth";
import { fail, ok, readJson } from "@/lib/server/http";
import { adminAuthClient, emailsByUserId } from "@/lib/server/users";
import {
  createPublicServiceClient,
  createServiceClient,
} from "@/lib/supabase/service";

// List the church's follow-up team — also the assignee picker on a card.
// Any member may read (you need the list to assign a card to a colleague).
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const churchId = new URL(req.url).searchParams.get("churchId");
    if (!churchId) return fail(400, "missing_fields");
    await requireMember(user.id, churchId);

    const db = createServiceClient();
    const { data, error } = await db
      .from("member")
      .select("user_id, role")
      .eq("church_id", churchId);
    if (error) return fail(500, "internal");

    const emails = await emailsByUserId((data ?? []).map((m) => m.user_id as string));
    const members = (data ?? []).map((m) => ({
      userId: m.user_id as string,
      email: emails.get(m.user_id as string) ?? null,
      role: m.role as "admin" | "follower",
    }));
    return ok({ members });
  } catch (err) {
    return authFail(err) ?? Promise.reject(err);
  }
}

// Invite a follow-up team member by email. If the address has no Sunday account
// yet, Supabase sends an invite that doubles as their first login link.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{
      churchId?: string;
      email?: string;
      role?: "admin" | "follower";
    }>(req);
    const email = body?.email?.trim().toLowerCase();
    if (!body?.churchId || !email) return fail(400, "missing_fields");
    await requireAdmin(user.id, body.churchId);

    const auth = adminAuthClient();
    let userId: string | null = null;
    const { data: invited, error: inviteErr } =
      await auth.auth.admin.inviteUserByEmail(email);
    if (!inviteErr) {
      userId = invited.user.id;
    } else if (/already.*registered|already.*exists/i.test(inviteErr.message)) {
      const { data: list } = await auth.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    }
    if (!userId) return fail(404, "user_not_found");

    const db = createServiceClient();
    const { error } = await db.from("member").upsert({
      church_id: body.churchId,
      user_id: userId,
      role: body.role === "admin" ? "admin" : "follower",
    });
    if (error) return fail(500, "internal");

    // Mirror into suite membership so SSO grants line up later.
    const pub = createPublicServiceClient();
    await pub
      .from("church_member")
      .upsert({ church_id: body.churchId, user_id: userId, role: "viewer" })
      .select();

    return ok({ userId });
  } catch (err) {
    return authFail(err) ?? Promise.reject(err);
  }
}
