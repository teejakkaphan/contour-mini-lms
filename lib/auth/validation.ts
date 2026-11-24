export type SignupInput = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

type SignupParseResult =
  | { ok: true; input: SignupInput }
  | { ok: false; error: string };

const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_\x60{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function parseSignupInput(body: unknown): SignupParseResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Expected a JSON object" };
  }

  if (!("first_name" in body) || typeof body.first_name !== "string" || !body.first_name.trim()) {
    return { ok: false, error: "First name is required" };
  }
  if (!("last_name" in body) || typeof body.last_name !== "string" || !body.last_name.trim()) {
    return { ok: false, error: "Last name is required" };
  }
  if (!("email" in body) || typeof body.email !== "string" || !emailPattern.test(body.email.trim())) {
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
