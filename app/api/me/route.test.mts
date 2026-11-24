import { AuthSessionMissingError } from "@supabase/supabase-js";
import { expect, test, vi } from "vitest";
import { GET } from "./route";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

test("returns only the current user's name and email", async () => {
  getUser.mockResolvedValue({ data: { user: {
    id: "user-id",
    email: "ada@example.test",
    user_metadata: { first_name: "Ada", last_name: "Lovelace", role: "student" },
  } }, error: null });

  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({
    first_name: "Ada", last_name: "Lovelace", email: "ada@example.test",
  });
});

test("returns null for missing or non-string profile fields", async () => {
  getUser.mockResolvedValue({ data: { user: { user_metadata: { last_name: 42 } } }, error: null });

  expect(await (await GET()).json()).toEqual({ first_name: null, last_name: null, email: null });
});

test("requires a signed-in user", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() });

  const response = await GET();
  expect(response.status).toBe(401);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

test("returns a generic error when Auth is unavailable", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: { status: 503, message: "Internal details" } });

  const response = await GET();
  expect(response.status).toBe(500);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ error: "Could not load user details" });
});
