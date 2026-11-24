import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  const headers = { "Cache-Control": "no-store" };
  if (error && !isAuthSessionMissingError(error) && error.status !== 401 && error.status !== 403) {
    return apiError("Could not load user details", 500, headers);
  }
  if (error || !data.user) {
    return apiError("Authentication required", 401, headers);
  }

  const { email, user_metadata } = data.user;
  return Response.json({
    first_name: typeof user_metadata.first_name === "string" ? user_metadata.first_name : null,
    last_name: typeof user_metadata.last_name === "string" ? user_metadata.last_name : null,
    email: email ?? null,
  }, { headers });
}
