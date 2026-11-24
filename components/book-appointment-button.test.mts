// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { BookAppointmentButton } from "./book-appointment-button";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("shows the booking link only after the API confirms the create permission", async () => {
  const { promise, resolve } = Promise.withResolvers<Response>();
  const fetchMock = vi.fn(() => promise);
  vi.stubGlobal("fetch", fetchMock);
  render(createElement(BookAppointmentButton));

  expect(screen.queryByRole("link", { name: "Book an appointment" })).toBeNull();
  expect(fetchMock).toHaveBeenCalledWith("/api/me/permissions", {
    signal: expect.any(AbortSignal),
    cache: "no-store",
  });

  resolve(Response.json({ permissions: ["consultations.create_own"] }));
  const bookingLink = await screen.findByRole("link", { name: "Book an appointment" });
  expect(bookingLink.getAttribute("href")).toBe("/booking");
});

test("hides the booking link for read-only users", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    Response.json({ permissions: ["consultations.read_all"] }),
  ));
  await act(async () => { render(createElement(BookAppointmentButton)); });

  expect(screen.queryByRole("link", { name: "Book an appointment" })).toBeNull();
});

test("keeps the booking link hidden if permissions cannot be loaded", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
  await act(async () => { render(createElement(BookAppointmentButton)); });

  expect(screen.queryByRole("link", { name: "Book an appointment" })).toBeNull();
});

test("aborts the pending permission request on unmount", () => {
  const { promise } = Promise.withResolvers<Response>();
  const fetchMock = vi.fn<typeof fetch>(() => promise);
  vi.stubGlobal("fetch", fetchMock);
  const { unmount } = render(createElement(BookAppointmentButton));
  const signal = fetchMock.mock.calls[0][1]?.signal;

  expect(signal?.aborted).toBe(false);
  unmount();
  expect(signal?.aborted).toBe(true);
});
