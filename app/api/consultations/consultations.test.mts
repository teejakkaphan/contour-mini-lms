import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import type { ResolveFnOutput, ResolveHookContext } from "node:module";
import { mock, test } from "node:test";

// The project uses Node 20 type definitions. The test runner uses Node 24.
type ResolveHook = (
  specifier: string,
  context: ResolveHookContext,
  nextResolve: (specifier: string, context: ResolveHookContext) => ResolveFnOutput,
) => ResolveFnOutput;

const { registerHooks } = nodeModule as typeof nodeModule & {
  registerHooks(hooks: { resolve: ResolveHook }): { deregister(): void };
};

const projectRoot = new URL("../../../", import.meta.url);
const serverClientUrl = new URL("lib/supabase/server.ts", projectRoot);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = new URL(`${specifier.slice(2)}.ts`, projectRoot);
      return nextResolve(target.href, context);
    }
    if (specifier === "./shared" || specifier === "../shared") {
      return nextResolve(`${specifier}.ts`, context);
    }
    if (specifier === "./route.js" || specifier === "./[id]/route.js") {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const createClient = mock.fn<() => Promise<unknown>>();
const mockOptions = { cache: false, exports: { createClient } };
mock.module(serverClientUrl.href, mockOptions);

const { GET, POST } = await import("./route.js");
const { PATCH } = await import("./[id]/route.js");
hooks.deregister();

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
  data?: typeof savedBooking | (typeof savedBooking)[] | null;
  error?: { code?: string; message?: string } | null;
};

function mockSupabase({ signedIn = true, data = null, error = null }: SupabaseMockOptions = {}) {
  const result = { data, error };
  const query = {
    select: mock.fn((): object => query),
    order: mock.fn((): object => query),
    insert: mock.fn((): object => query),
    update: mock.fn((): object => query),
    eq: mock.fn((): object => query),
    single: mock.fn(async () => result),
    maybeSingle: mock.fn(async () => result),
    then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
  };
  const from = mock.fn(() => query);
  createClient.mock.mockImplementation(async () => ({
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
    POST(request("POST", booking)),
    PATCH(request("PATCH", { status: "complete" }), context),
  ]);

  for (const response of responses) {
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Authentication required" });
  }
  assert.equal(from.mock.callCount(), 0);
});

test("GET returns the rows visible to the caller in scheduled order", async () => {
  const { from, query } = mockSupabase({ data: [savedBooking] });
  const response = await GET();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), [savedBooking]);
  assert.deepEqual(from.mock.calls[0].arguments, ["consultations"]);
  assert.deepEqual(query.order.mock.calls.map((call) => call.arguments), [
    ["scheduled_at"],
    ["id"],
  ]);
  assert.equal(query.eq.mock.callCount(), 0);
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
  assert.deepEqual(query.insert.mock.calls[0].arguments, [{
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
  assert.equal(from.mock.callCount(), 0);
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
  assert.deepEqual(query.update.mock.calls[0].arguments, [{
    scheduled_at: savedBooking.scheduled_at,
    status: "cancelled",
  }]);
  assert.deepEqual(query.eq.mock.calls[0].arguments, ["id", id]);
});

test("PATCH rejects an invalid ID, unsupported fields, and invalid values", async () => {
  const { from } = mockSupabase();
  const invalidId = { params: Promise.resolve({ id: "invalid" }) };
  assert.equal((await PATCH(request("PATCH", { status: "complete" }), invalidId)).status, 400);

  for (const body of [{}, { student_id: userId }, { status: "pending" }, { scheduled_at: null }]) {
    assert.equal((await PATCH(request("PATCH", body), context)).status, 400);
  }
  assert.equal(from.mock.callCount(), 0);
});

test("PATCH returns 404 when no row was updated and 403 for a permission error", async () => {
  mockSupabase();
  assert.equal((await PATCH(request("PATCH", { status: "complete" }), context)).status, 404);

  mockSupabase({ error: { code: "42501" } });
  assert.equal((await PATCH(request("PATCH", { status: "complete" }), context)).status, 403);
});
