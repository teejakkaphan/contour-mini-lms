import { apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

type SignupInput = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

type SignupParseResult =
  | { ok: true; input: SignupInput }
  | { ok: false; error: string };

function parseSignupInput(body: unknown): SignupParseResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Expected a JSON object" };
  }

  if (!("first_name" in body) || typeof body.first_name !== "string" || !body.first_name.trim()) {
    return { ok: false, error: "First name is required" };
  }
  if (!("last_name" in body) || typeof body.last_name !== "string" || !body.last_name.trim()) {
    return { ok: false, error: "Last name is required" };
  }
  if (!("email" in body) || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return { ok: false, error: "Enter a valid email address" };
  }
  if (!("password" in body) || typeof body.password !== "string" || body.password.length < 6 || !body.password.trim()) {
    return { ok: false, error: "Password must contain at least 6 characters and cannot be all whitespace" };
  }

  return {
    ok: true,
    input: {
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      email: body.email.trim(),
      password: body.password,
    },
  };
}

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
