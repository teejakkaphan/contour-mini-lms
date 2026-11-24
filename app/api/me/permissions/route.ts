import { apiError } from "@/lib/api/response";
import { getApiSession, getEffectivePermissions } from "../../_shared/supabase";

export async function GET() {
  const session = await getApiSession();
  if (!session) return apiError("Authentication required", 401);

  const permissions = await getEffectivePermissions(session.supabase);
  if (!permissions) return apiError("Could not load permissions", 500);

  return Response.json({ permissions }, { headers: { "Cache-Control": "no-store" } });
}
