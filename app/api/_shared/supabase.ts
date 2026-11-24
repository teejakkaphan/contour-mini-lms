import { createClient } from "@/lib/supabase/server";

type SessionClient = Awaited<ReturnType<typeof createClient>>;

export async function getApiSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  return !error && userId ? { supabase, userId } : null;
}

export async function getEffectivePermissions(supabase: SessionClient) {
  const { data, error } = await supabase
    .from("current_user_permissions")
    .select("permission")
    .order("permission");

  if (error) return null;
  return data.map(({ permission }) => permission);
}
