// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { getApiSession, getEffectivePermissions } from "@/app/api/_shared/supabase";
import ReschedulePage from "./page";

vi.mock("@/app/api/_shared/supabase", () => ({
  getApiSession: vi.fn(),
  getEffectivePermissions: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), ...navigation }));

const navigation = vi.hoisted(() => ({
  notFound: () => { throw new Error("Not found"); },
  redirect: (url: string) => { throw new Error(`Redirect to ${url}`); },
}));
const id = "021a1563-09c8-4a86-a623-44cd3b3e7f4a";
const params = Promise.resolve({ id });

function mockSession(permissions: string[], data: unknown = null) {
  const query = {
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  const from = vi.fn(() => ({ select: () => query }));
  vi.mocked(getApiSession).mockResolvedValue({ userId: "student-id", supabase: { from } } as unknown as NonNullable<Awaited<ReturnType<typeof getApiSession>>>);
  vi.mocked(getEffectivePermissions).mockResolvedValue(permissions);
  return { from, query };
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test("loads the consultation by ID and owner before rendering the form", async () => {
  const { query } = mockSession(["consultations.update_own"], {
    reason: "Math revision",
    scheduled_at: "2026-11-25T01:00:00Z",
  });

  render(await ReschedulePage({ params }));

  expect(query.eq.mock.calls).toEqual([["id", id], ["student_id", "student-id"]]);
  expect(screen.getByText("Math revision")).toBeTruthy();
  expect(screen.getByLabelText("New date and time (local)")).toBeTruthy();
});

test("hides the form from a read-only user without querying the booking", async () => {
  const { from } = mockSession(["consultations.read_all"]);
  await expect(ReschedulePage({ params })).rejects.toThrow("Not found");
  expect(from).not.toHaveBeenCalled();
});

test("returns not found when the caller's booking query returns no row", async () => {
  mockSession(["consultations.update_own"]);
  await expect(ReschedulePage({ params })).rejects.toThrow("Not found");
});
