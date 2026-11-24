import { parseSignupInput } from "@/lib/auth/validation";
import { apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0];
  if (contentType?.trim().toLowerCase() !== "application/json") {
    return apiError("Expected application/json", 415);
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = parseSignupInput(body);
  if (!parsed.ok) return apiError(parsed.error, 400);

  const { first_name, last_name, email, password } = parsed.input;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name, last_name },
      },
    });

    if (error) {
      if (error.status && error.status >= 400 && error.status < 500) {
        return apiError(error.message, error.status);
      }
      return apiError("Could not create account", 500);
    }

    return Response.json(
      { requiresEmailConfirmation: !data.session },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return apiError("Could not create account", 500);
  }
}
