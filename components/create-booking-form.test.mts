// @vitest-environment jsdom

import assert from "node:assert/strict";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, test, vi } from "vitest";
import { CreateBookingForm } from "./create-booking-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const localTime = "2026-11-25T10:00";

async function fillBooking(user: ReturnType<typeof userEvent.setup>, reason = "Math revision") {
  await user.type(screen.getByLabelText("First name"), "Ada");
  await user.type(screen.getByLabelText("Last name"), "Lovelace");
  await user.type(screen.getByLabelText("Reason for consultation"), reason);
  fireEvent.change(screen.getByLabelText("Date and time (local)"), {
    target: { value: localTime },
  });
}

test("Book stays disabled until every required field has a value", async () => {
  const user = userEvent.setup();
  render(createElement(CreateBookingForm));
  const button = screen.getByRole<HTMLButtonElement>("button", { name: "Book" });
  assert.equal(button.disabled, true);

  await fillBooking(user, "  ");
  assert.equal(button.disabled, true);

  const reason = screen.getByLabelText("Reason for consultation");
  await user.clear(reason);
  await user.type(reason, "Math revision");
  assert.equal(button.disabled, false);

  await user.clear(screen.getByLabelText("First name"));
  assert.equal(button.disabled, true);
});

test("submits booking details in UTC, disables Book while saving, and resets on success", async () => {
  const user = userEvent.setup();
  const { promise, resolve } = Promise.withResolvers<Response>();
  const fetchMock = vi.fn<typeof fetch>(() => promise);
  vi.stubGlobal("fetch", fetchMock);
  render(createElement(CreateBookingForm));
  await fillBooking(user);

  await user.click(screen.getByRole("button", { name: "Book" }));
  assert.equal(screen.getByRole<HTMLButtonElement>("button", { name: "Booking…" }).disabled, true);
  assert.equal(fetchMock.mock.calls.length, 1);
  const [url, options] = fetchMock.mock.calls[0];
  assert.equal(url, "/api/consultations");
  assert.equal(options?.method, "POST");
  assert.equal(typeof options?.body, "string");
  assert.deepEqual(JSON.parse(String(options?.body)), {
    first_name: "Ada",
    last_name: "Lovelace",
    reason: "Math revision",
    scheduled_at: new Date(2026, 10, 25, 10).toISOString(),
  });

  resolve(new Response(null, { status: 201 }));
  assert.equal((await screen.findByRole("status")).textContent, "Consultation booked.");
  assert.equal(screen.getByLabelText<HTMLInputElement>("First name").value, "");
  assert.equal(screen.getByRole<HTMLButtonElement>("button", { name: "Book" }).disabled, true);
});

test("shows an API error and preserves fields so the user can retry", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", async () =>
    Response.json({ error: "Booking is forbidden" }, { status: 403 }),
  );
  render(createElement(CreateBookingForm));
  await fillBooking(user);

  await user.click(screen.getByRole("button", { name: "Book" }));
  assert.equal((await screen.findByRole("alert")).textContent, "Booking is forbidden");
  assert.equal(screen.getByLabelText<HTMLInputElement>("First name").value, "Ada");
  assert.equal(screen.getByLabelText<HTMLInputElement>("Date and time (local)").value, localTime);
  await waitFor(() => {
    assert.equal(screen.getByRole<HTMLButtonElement>("button", { name: "Book" }).disabled, false);
  });
});

test("shows a retry message after a network failure", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", async () => {
    throw new Error("Network unavailable");
  });
  render(createElement(CreateBookingForm));
  await fillBooking(user);

  await user.click(screen.getByRole("button", { name: "Book" }));
  assert.equal(
    (await screen.findByRole("alert")).textContent,
    "Could not book consultation. Please try again.",
  );
  assert.equal(screen.getByRole<HTMLButtonElement>("button", { name: "Book" }).disabled, false);
});
