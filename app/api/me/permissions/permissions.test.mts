import { expect, test, vi } from "vitest";
import { GET } from "./route";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

function mockSession({ userId = "user-id", permissions = ["consultations.read_all"], fails = false } = {}) {
  const order = vi.fn().mockResolvedValue({
    data: permissions.map((permission) => ({ permission })),
    error: fails ? { message: "Database failure" } : null,
  });
  const select = vi.fn().mockReturnValue({ order });
  const from = vi.fn().mockReturnValue({ select });
  createClient.mockResolvedValue({
    auth: { getClaims: async () => ({ data: { claims: { sub: userId } } }) },
    from,
  });
  return { from, select, order };
}

test("rejects unsigned requests before loading permissions", async () => {
  const { from } = mockSession({ userId: "" });
  expect((await GET()).status).toBe(401);
  expect(from).not.toHaveBeenCalled();
});

test("returns effective permission keys with a no-store header", async () => {
  const permissions = ["consultations.read_all", "consultations.update_own"];
  const { from, select, order } = mockSession({ permissions });
  const response = await GET();

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ permissions });
  expect(from).toHaveBeenCalledExactlyOnceWith("current_user_permissions");
  expect(select).toHaveBeenCalledWith("permission");
  expect(order).toHaveBeenCalledWith("permission");
});

test("returns an empty permissions list when the user has no grants", async () => {
  mockSession({ permissions: [] });
  expect(await (await GET()).json()).toEqual({ permissions: [] });
});

test("returns a generic error when the permission lookup fails", async () => {
  mockSession({ fails: true });
  const response = await GET();

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Could not load permissions" });
});
