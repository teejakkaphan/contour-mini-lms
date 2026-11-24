import { afterEach, expect, test, vi } from "vitest";
import { getMe, getMyPermissions, postSignup } from "./auth";

const signup = {
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.test",
  password: "test-password",
};

afterEach(() => vi.unstubAllGlobals());

test.each([
  { path: "/api/me", load: getMe, data: { first_name: "Ada", last_name: null, email: signup.email } },
  { path: "/api/me/permissions", load: getMyPermissions, data: { permissions: ["consultations.create_own"] } },
])("GET $path forwards the signal and disables caching", async ({ path, load, data }) => {
  const { signal } = new AbortController();
  const fetchMock = vi.fn().mockResolvedValue(Response.json(data));
  vi.stubGlobal("fetch", fetchMock);

  await expect(load(signal)).resolves.toEqual(data);
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(path, { signal, cache: "no-store" });
});

test.each([
  ["account details", getMe, "Could not load account details."],
  ["permissions", getMyPermissions, "Could not load permissions."],
] as const)("rejects a failed %s request", async (_name, load, message) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

  await expect(load()).rejects.toThrow(message);
});

test("posts signup JSON and returns the confirmation result", async () => {
  const result = { requiresEmailConfirmation: true };
  const fetchMock = vi.fn().mockResolvedValue(Response.json(result, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(postSignup(signup)).resolves.toEqual(result);
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signup),
  });
});

test("passes through a signup error returned by the API", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    Response.json({ error: "Email already registered" }, { status: 422 }),
  ));

  await expect(postSignup(signup)).rejects.toThrow("Email already registered");
});

test("uses a fallback message for a non-JSON signup error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })));

  await expect(postSignup(signup)).rejects.toThrow("Could not create account.");
});
