// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { RescheduleBookingForm } from "./reschedule-booking-form";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const consultationId = "021a1563-09c8-4a86-a623-44cd3b3e7f4a";
const localTime = "2026-11-25T10:00";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  replace.mockClear();
});

test("saves the new time via PATCH, clears the form, and returns to the dashboard", async () => {
  const { promise, resolve } = Promise.withResolvers<Response>();
  const fetchMock = vi.fn(() => promise);
  vi.stubGlobal("fetch", fetchMock);
  render(createElement(RescheduleBookingForm, { consultationId }));

  const save = screen.getByRole<HTMLButtonElement>("button", { name: "Save new time" });
  expect(save.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("New date and time (local)"), { target: { value: localTime } });
  fireEvent.click(save);

  const scheduledAt = new Date(2026, 10, 25, 10).toISOString();
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/api/consultations/${consultationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  });
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Saving…" }).disabled).toBe(true);

  resolve(Response.json({ id: consultationId, scheduled_at: scheduledAt }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  expect(screen.getByLabelText<HTMLInputElement>("New date and time (local)").value).toBe("");
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save new time" }).disabled).toBe(true);
});

test("keeps the selected time and enables retry after a failed update", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    Response.json({ error: "Consultation not found" }, { status: 404 }),
  ));
  render(createElement(RescheduleBookingForm, { consultationId }));

  const input = screen.getByLabelText<HTMLInputElement>("New date and time (local)");
  fireEvent.change(input, { target: { value: localTime } });
  fireEvent.click(screen.getByRole("button", { name: "Save new time" }));

  expect((await screen.findByRole("alert")).textContent).toBe("Consultation not found");
  expect(input.value).toBe(localTime);
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save new time" }).disabled).toBe(false);
  expect(replace).not.toHaveBeenCalled();
});
