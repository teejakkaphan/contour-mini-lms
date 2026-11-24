import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

type SessionClient = Awaited<ReturnType<typeof createClient>>;
type PermissionRow = { permission: string };

export async function getApiSession(): Promise<{supabase: SupabaseClient, userId: string} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  return !error && userId ? { supabase, userId } : null;
}

export async function getEffectivePermissions(supabase: SessionClient): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("current_user_permissions")
    .select("permission")
    .order("permission");

  if (error) return null;
  return data.map(({ permission }: PermissionRow) => permission);
}
