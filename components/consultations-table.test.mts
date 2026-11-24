// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { ConsultationsTable } from "./consultations-table";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("shows loading, then renders the consultations returned by the API", async () => {
  const { promise, resolve } = Promise.withResolvers<Response>();
  const fetchMock = vi.fn<typeof fetch>(() => promise);
  vi.stubGlobal("fetch", fetchMock);
  render(createElement(ConsultationsTable));

  expect(screen.getByRole("status").textContent).toBe("Loading consultations…");
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock).toHaveBeenCalledWith("/api/consultations", {
    signal: expect.any(AbortSignal),
  });

  const scheduledAt = "2026-11-24T21:00:00.000Z";
  resolve(Response.json([{
    id: "booking-1",
    first_name: "Ada",
    last_name: "Lovelace",
    reason: "Math revision",
    scheduled_at: scheduledAt,
    status: "incomplete",
    actions: ["reschedule", "cancel"],
  }, {
    id: "booking-2",
    first_name: "Grace",
    last_name: "Hopper",
    reason: "Computer science revision",
    scheduled_at: scheduledAt,
    status: "incomplete",
    actions: [],
  }]));

  const table = within(await screen.findByRole("table"));
  expect(table.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
    "Student", "Reason", "Scheduled time", "Status", "Actions",
  ]);
  const row = within(table.getByRole("row", { name: /Ada Lovelace/ }));
  expect(row.getByRole("cell", { name: "Math revision" })).toBeTruthy();
  expect(row.getByRole("cell", { name: "incomplete" })).toBeTruthy();
  expect(row.getByRole("time").getAttribute("datetime")).toBe(scheduledAt);
  expect(row.getByRole("time").textContent).toBeTruthy();
  expect(row.getByRole("link", { name: "Reschedule" }).getAttribute("href")).toBe("/booking/booking-1");
  const readOnlyRow = within(table.getByRole("row", { name: /Grace Hopper/ }));
  expect(readOnlyRow.queryByRole("link", { name: "Reschedule" })).toBeNull();
  expect(readOnlyRow.queryByRole("button", { name: "Cancel" })).toBeNull();
  expect(screen.queryByRole("status")).toBeNull();
});

const cancellableBooking = {
  id: "booking-1",
  first_name: "Ada",
  last_name: "Lovelace",
  reason: "Math revision",
  scheduled_at: "2026-11-24T21:00:00.000Z",
  status: "incomplete",
  actions: ["reschedule", "cancel"],
};

test("cancels the selected booking through PATCH and keeps its row visible", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json([cancellableBooking]))
    .mockResolvedValueOnce(Response.json({ ...cancellableBooking, status: "cancelled" }));
  vi.stubGlobal("fetch", fetchMock);
  render(createElement(ConsultationsTable));

  fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

  expect(await screen.findByRole("cell", { name: "cancelled" })).toBeTruthy();
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/consultations/booking-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  });
  expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Reschedule" })).toBeNull();
});

test("keeps the booking unchanged and allows a retry when cancellation fails", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json([cancellableBooking]))
    .mockResolvedValueOnce(Response.json({ error: "Update is forbidden" }, { status: 403 }));
  vi.stubGlobal("fetch", fetchMock);
  render(createElement(ConsultationsTable));

  fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

  expect((await screen.findByRole("alert")).textContent).toBe("Update is forbidden");
  expect(screen.getByRole("cell", { name: "incomplete" })).toBeTruthy();
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Cancel" }).disabled).toBe(false);
});

test("shows an empty state when the API returns no consultations", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([])));
  render(createElement(ConsultationsTable));

  expect(await screen.findByText("No consultations yet.")).toBeTruthy();
  expect(screen.queryByRole("table")).toBeNull();
});

test("links to sign-in when the API returns 401", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
  render(createElement(ConsultationsTable));

  const signIn = await screen.findByRole("link", { name: "Sign in" });
  expect(signIn.getAttribute("href")).toBe("/auth/login");
  expect(screen.queryByRole("alert")).toBeNull();
});

test.each(["HTTP error", "network error"])("shows a loading error after a %s", async (failure) => {
  const fetchMock = vi.fn<typeof fetch>();
  if (failure === "HTTP error") {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
  } else {
    fetchMock.mockRejectedValue(new Error("Network unavailable"));
  }
  vi.stubGlobal("fetch", fetchMock);
  render(createElement(ConsultationsTable));

  expect((await screen.findByRole("alert")).textContent).toBe("Could not load consultations.");
  expect(screen.queryByRole("table")).toBeNull();
});

test("aborts a pending consultations request on unmount", () => {
  const { promise } = Promise.withResolvers<Response>();
  const fetchMock = vi.fn<typeof fetch>(() => promise);
  vi.stubGlobal("fetch", fetchMock);
  const { unmount } = render(createElement(ConsultationsTable));
  const signal = fetchMock.mock.calls[0][1]?.signal;

  expect(signal?.aborted).toBe(false);
  unmount();
  expect(signal?.aborted).toBe(true);
});
