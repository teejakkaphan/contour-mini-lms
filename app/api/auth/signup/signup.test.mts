import { beforeEach, expect, test, vi } from "vitest";
import { POST } from "./route";

const { createClient, signUp } = vi.hoisted(() => ({
  createClient: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

const signup = {
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  password: "test-password",
};

function request(body: unknown) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  createClient.mockResolvedValue({ auth: { signUp } });
});

test("rejects non-JSON requests before contacting Supabase", async () => {
  const response = await POST(new Request("http://localhost/api/auth/signup", {
    method: "POST",
    body: "not JSON",
  }));

  expect(response.status).toBe(415);
  expect(createClient).not.toHaveBeenCalled();
});

test("rejects malformed JSON before contacting Supabase", async () => {
  const response = await POST(new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  }));

  expect(response.status).toBe(400);
  expect(createClient).not.toHaveBeenCalled();
});

test.each([
  { first_name: " " },
  { last_name: undefined },
  { email: "invalid-email" },
  { password: "short" },
  { password: "      " },
])("rejects invalid signup fields (%j)", async (invalid) => {
  const response = await POST(request({ ...signup, ...invalid }));

  expect(response.status).toBe(400);
  expect(createClient).not.toHaveBeenCalled();
});

test("creates an account with trimmed names and email and preserves the password", async () => {
  signUp.mockResolvedValue({ data: { session: { access_token: "session-token" } }, error: null });
  const response = await POST(request({
    first_name: " Ada ",
    last_name: " Lovelace ",
    email: " ada@example.com ",
    password: " test-password ",
    role: "admin",
  }));

  expect(signUp).toHaveBeenCalledExactlyOnceWith({
    email: signup.email,
    password: " test-password ",
    options: { data: { first_name: "Ada", last_name: "Lovelace" } },
  });
  expect(response.status).toBe(201);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ requiresEmailConfirmation: false });
});

test("reports that email confirmation is required when Supabase returns no session", async () => {
  signUp.mockResolvedValue({ data: { session: null }, error: null });
  const response = await POST(request(signup));

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ requiresEmailConfirmation: true });
});

test("preserves Supabase's client error status and message", async () => {
  signUp.mockResolvedValue({ error: { status: 429, message: "Too many requests" } });
  const response = await POST(request(signup));

  expect(response.status).toBe(429);
  expect(await response.json()).toEqual({ error: "Too many requests" });
});

test("returns a generic error when Supabase fails unexpectedly", async () => {
  signUp.mockRejectedValue(new Error("Internal service details"));
  const response = await POST(request(signup));

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Could not create account" });
});
