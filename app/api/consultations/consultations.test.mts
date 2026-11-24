import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { GET, POST } from "./route";
import { GET as GET_BY_ID, PATCH } from "./[id]/route";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

const userId = "697fa40a-4994-4027-97e6-e6e2c90aada9";
const id = "021a1563-09c8-4a86-a623-44cd3b3e7f4a";
const context = { params: Promise.resolve({ id }) };
const booking = {
  first_name: "Ada",
  last_name: "Lovelace",
  reason: "Math revision",
  scheduled_at: "2026-11-25T10:00:00+13:00",
};
const savedBooking = {
  ...booking,
  id,
  scheduled_at: "2026-11-24T21:00:00.000Z",
  status: "incomplete",
};

function request(method: "POST" | "PATCH", body: unknown) {
  return new Request("http://localhost/api/consultations", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

type SupabaseMockOptions = {
  signedIn?: boolean;
  data?: (typeof savedBooking & { student_id?: string }) | (typeof savedBooking & { student_id: string })[] | null;
  permissions?: string[];
  permissionError?: boolean;
  error?: { code?: string; message?: string } | null;
};

function mockSupabase({ signedIn = true, data = null, error = null, permissions = [], permissionError = false }: SupabaseMockOptions = {}) {
  const result = { data, error };
  const query = {
    select: vi.fn((): object => query),
    order: vi.fn((): object => query),
    insert: vi.fn((): object => query),
    update: vi.fn((): object => query),
    eq: vi.fn((): object => query),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
  };
  const permissionQuery = {
    select: vi.fn(() => permissionQuery),
    order: vi.fn(async () => ({
      data: permissions.map((permission) => ({ permission })),
      error: permissionError ? { message: "Permissions unavailable" } : null,
    })),
  };
  const from = vi.fn((table: string) => table === "current_user_permissions" ? permissionQuery : query);
  createClient.mockImplementation(async () => ({
    from,
    auth: {
      getClaims: async () => signedIn
        ? { data: { claims: { sub: userId } }, error: null }
        : { data: null, error: new Error("Missing session") },
    },
  }));
  return { from, query };
}

test("all consultation handlers reject signed-out callers before querying", async () => {
  const { from } = mockSupabase({ signedIn: false });
  const responses = await Promise.all([
    GET(),
    GET_BY_ID(new Request(`http://localhost/api/consultations/${id}`), context),
    POST(request("POST", booking)),
    PATCH(request("PATCH", { status: "complete" }), context),
  ]);

  for (const response of responses) {
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Authentication required" });
  }
  assert.equal(from.mock.calls.length, 0);
});

test.each([
  [userId, ["consultations.update_own"], ["reschedule"]],
  [userId, ["consultations.read_all"], []],
  ["another-user", ["consultations.update_own", "consultations.read_all"], []],
] as const)("GET by ID derives actions from ownership and grants (%s, %j)", async (studentId, permissions, actions) => {
  const { query } = mockSupabase({ data: { ...savedBooking, student_id: studentId }, permissions: [...permissions] });
  const response = await GET_BY_ID(new Request(`http://localhost/api/consultations/${id}`), context);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(query.eq.mock.calls, [["id", id]]);
  assert.deepEqual(await response.json(), { ...savedBooking, actions });
});

test("GET by ID returns 404 when RLS hides the booking or it does not exist", async () => {
  mockSupabase();
  const response = await GET_BY_ID(new Request(`http://localhost/api/consultations/${id}`), context);
  assert.equal(response.status, 404);
});

test("GET by ID rejects malformed IDs without querying Supabase", async () => {
  const { from } = mockSupabase();
  const response = await GET_BY_ID(new Request("http://localhost/api/consultations/abc"), {
    params: Promise.resolve({ id: "abc" }),
  });
  assert.equal(response.status, 400);
  assert.equal(from.mock.calls.length, 0);
});

test("GET returns the rows visible to the caller in scheduled order", async () => {
  const { from, query } = mockSupabase({
    permissions: ["consultations.read_all"],
    data: [{ ...savedBooking, student_id: userId }],
  });
  const response = await GET();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), [{ ...savedBooking, actions: [] }]);
  assert.deepEqual(from.mock.calls, [["consultations"], ["current_user_permissions"]]);
  assert.deepEqual(query.order.mock.calls, [
    ["scheduled_at"],
    ["id"],
  ]);
  assert.equal(query.eq.mock.calls.length, 0);
});

test("GET offers rescheduling only on owned rows when the caller has the update grant", async () => {
  const otherBooking = { ...savedBooking, id: "another-booking" };
  mockSupabase({
    permissions: ["consultations.update_own", "consultations.read_all"],
    data: [{ ...savedBooking, student_id: userId }, { ...otherBooking, student_id: "another-user" }],
  });

  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [
    { ...savedBooking, actions: ["reschedule"] },
    { ...otherBooking, actions: [] },
  ]);
});

test("GET returns an empty list when no rows are visible", async () => {
  mockSupabase({ data: [] });
  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test("GET returns a generic server error when Supabase fails", async () => {
  mockSupabase({ error: { message: "internal database details" } });
  const response = await GET();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Could not load consultations" });
});

test("GET returns a generic server error if permissions cannot be loaded", async () => {
  mockSupabase({ data: [], permissionError: true });
  const response = await GET();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Could not load consultations" });
});

test("POST uses the session owner, trims text, and normalizes the date", async () => {
  const { query } = mockSupabase({ data: savedBooking });
  const response = await POST(request("POST", {
    ...booking,
    first_name: " Ada ",
    student_id: "another user",
    status: "complete",
  }));

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), savedBooking);
  assert.deepEqual(query.insert.mock.calls[0], [{
    ...booking,
    scheduled_at: savedBooking.scheduled_at,
    student_id: userId,
  }]);
});

test("POST rejects malformed JSON, missing fields, and invalid dates", async () => {
  const { from } = mockSupabase();
  const invalidRequests = [
    new Request("http://localhost/api/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    }),
    request("POST", { ...booking, reason: " " }),
    request("POST", { ...booking, scheduled_at: "2026-11-25T10:00" }),
    request("POST", { ...booking, scheduled_at: "2026-02-30T10:00:00Z" }),
  ];

  for (const invalidRequest of invalidRequests) {
    assert.equal((await POST(invalidRequest)).status, 400);
  }
  assert.equal(from.mock.calls.length, 0);
});

test("POST returns 403 when Supabase rejects the insert", async () => {
  mockSupabase({ error: { code: "42501" } });
  assert.equal((await POST(request("POST", booking))).status, 403);
});

test("PATCH updates the requested booking's time and status", async () => {
  const updated = { ...savedBooking, status: "cancelled" };
  const { query } = mockSupabase({ data: updated });
  const response = await PATCH(request("PATCH", {
    scheduled_at: booking.scheduled_at,
    status: "cancelled",
  }), context);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), updated);
  assert.deepEqual(query.update.mock.calls[0], [{
    scheduled_at: savedBooking.scheduled_at,
    status: "cancelled",
  }]);
  assert.deepEqual(query.eq.mock.calls[0], ["id", id]);
});

test("PATCH rejects an invalid ID, unsupported fields, and invalid values", async () => {
  const { from } = mockSupabase();
  const invalidId = { params: Promise.resolve({ id: "invalid" }) };
  assert.equal((await PATCH(request("PATCH", { status: "complete" }), invalidId)).status, 400);

  for (const body of [{}, { student_id: userId }, { status: "pending" }, { scheduled_at: null }]) {
    assert.equal((await PATCH(request("PATCH", body), context)).status, 400);
  }
  assert.equal(from.mock.calls.length, 0);
});

test("PATCH returns 404 when no row was updated and 403 for a permission error", async () => {
  mockSupabase();
  assert.equal((await PATCH(request("PATCH", { status: "complete" }), context)).status, 404);

  mockSupabase({ error: { code: "42501" } });
  assert.equal((await PATCH(request("PATCH", { status: "complete" }), context)).status, 403);
});
