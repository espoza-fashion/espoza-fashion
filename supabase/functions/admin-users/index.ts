import { withSupabase } from "npm:@supabase/server";

type AdminUserSummary = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
};

Deno.serve(
  withSupabase({ auth: "user" }, async (_req, ctx) => {
    const userId = ctx.userClaims?.sub;
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // The user-scoped client enforces the existing admin_users RLS policy.
    const { data: adminRow, error: adminCheckError } = await ctx.supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminCheckError) {
      return Response.json({ error: "Unable to verify administrator access" }, { status: 500 });
    }
    if (!adminRow) {
      return Response.json({ error: "Administrator access required" }, { status: 403 });
    }

    // Only this server-side client can access the Auth Admin API.
    // Never expose the service/secret key or password fields to the browser.
    const adminClient = ctx.supabaseAdmin;
    if (!adminClient) {
      return Response.json({ error: "Admin service is not configured" }, { status: 503 });
    }

    const users: AdminUserSummary[] = [];
    const perPage = 500;
    for (let page = 1; page <= 100; page++) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) {
        return Response.json({ error: "Unable to retrieve account list" }, { status: 502 });
      }

      const batch = (data.users || []).map((u): AdminUserSummary => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
      }));
      users.push(...batch);
      if (batch.length < perPage) break;
    }

    return Response.json({ users, total: users.length });
  }),
);
