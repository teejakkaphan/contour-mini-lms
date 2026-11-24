// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import ReschedulePage from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const id = "021a1563-09c8-4a86-a623-44cd3b3e7f4a";
const params = Promise.resolve({ id });
const consultation = { id, reason: "Math revision", scheduled_at: "2026-11-25T01:00:00Z" };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("loads the consultation from the API before rendering the form", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...consultation, actions: ["reschedule"] }));
  vi.stubGlobal("fetch", fetchMock);

  render(await ReschedulePage({ params }));

  expect(await screen.findByLabelText("New date and time (local)")).toBeTruthy();
  expect(screen.getByText("Math revision")).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/api/consultations/${id}`, {
    signal: expect.any(AbortSignal),
  });
});

test.each([
  ["read-only", () => Response.json({ ...consultation, actions: [] })],
  ["missing", () => new Response(null, { status: 404 })],
] as const)("hides the form for a %s consultation", async (_label, response) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));
  render(await ReschedulePage({ params }));

  expect((await screen.findByRole("alert")).textContent).toBe("Consultation unavailable for rescheduling.");
  expect(screen.queryByLabelText("New date and time (local)")).toBeNull();
});
