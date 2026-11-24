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
const profile = { first_name: "Ada", last_name: "Lovelace", email: "ada@example.test" };

function mockBookingApi(postBooking?: () => Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(async (url) => {
    if (url === "/api/me") return Response.json(profile);
    if (url === "/api/consultations" && postBooking) return postBooking();
    throw new Error(`Unexpected request to ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function fillBooking(user: ReturnType<typeof userEvent.setup>, reason = "Math revision") {
  await user.type(screen.getByLabelText("Reason for consultation"), reason);
  fireEvent.change(screen.getByLabelText("Date and time (local)"), {
    target: { value: localTime },
  });
}

test("Book stays disabled until every required field has a value", async () => {
  const user = userEvent.setup();
  mockBookingApi();
  render(createElement(CreateBookingForm));
  const button = screen.getByRole<HTMLButtonElement>("button", { name: "Book" });
  assert.equal(button.disabled, true);

  await fillBooking(user, "  ");
  assert.equal(button.disabled, true);

  const reason = screen.getByLabelText("Reason for consultation");
  await user.clear(reason);
  await user.type(reason, "Math revision");
  assert.equal(button.disabled, false);

  assert.equal(screen.queryByLabelText("First name"), null);
  assert.equal(screen.queryByLabelText("Last name"), null);
  await user.clear(reason);
  assert.equal(button.disabled, true);
});

test("submits booking details in UTC, disables Book while saving, and resets on success", async () => {
  const user = userEvent.setup();
  const { promise, resolve } = Promise.withResolvers<Response>();
  const fetchMock = mockBookingApi(() => promise);
  render(createElement(CreateBookingForm));
  await fillBooking(user);

  await user.click(screen.getByRole("button", { name: "Book" }));
  assert.equal(screen.getByRole<HTMLButtonElement>("button", { name: "Booking…" }).disabled, true);
  assert.equal(fetchMock.mock.calls.length, 2);
  assert.equal(fetchMock.mock.calls[0][0], "/api/me");
  const [url, options] = fetchMock.mock.calls[1];
  assert.equal(url, "/api/consultations");
  assert.equal(options?.method, "POST");
  assert.equal(typeof options?.body, "string");
  assert.deepEqual(JSON.parse(String(options?.body)), {
    first_name: "Ada",
    last_name: "Lovelace",
    reason: "Math revision",
    scheduled_at: new Date(2026, 10, 25, 10).toISOString(),
  });

  resolve(Response.json({ id: "booking-1", ...JSON.parse(String(options?.body)), status: "incomplete" }, { status: 201 }));
  assert.equal((await screen.findByRole("status")).textContent, "Consultation booked.");
  assert.equal(screen.getByLabelText<HTMLInputElement>("Reason for consultation").value, "");
  assert.equal(screen.getByRole<HTMLButtonElement>("button", { name: "Book" }).disabled, true);
});

test("shows an API error and preserves fields so the user can retry", async () => {
  const user = userEvent.setup();
  mockBookingApi(async () =>
    Response.json({ error: "Booking is forbidden" }, { status: 403 }),
  );
  render(createElement(CreateBookingForm));
  await fillBooking(user);

  await user.click(screen.getByRole("button", { name: "Book" }));
  assert.equal((await screen.findByRole("alert")).textContent, "Booking is forbidden");
  assert.equal(screen.getByLabelText<HTMLInputElement>("Reason for consultation").value, "Math revision");
  assert.equal(screen.getByLabelText<HTMLInputElement>("Date and time (local)").value, localTime);
  await waitFor(() => {
    assert.equal(screen.getByRole<HTMLButtonElement>("button", { name: "Book" }).disabled, false);
  });
});

test("shows a retry message after a network failure", async () => {
  const user = userEvent.setup();
  mockBookingApi(async () => {
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

test.each([
  [Response.json({ ...profile, last_name: null }), "Your account needs a first and last name before you can book."],
  [new Response(null, { status: 500 }), "Could not load your account details. Reload the page to try again."],
])("blocks booking when account details are unavailable", async (response, message) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(createElement(CreateBookingForm));

  await fillBooking(user);
  assert.equal((await screen.findByRole("alert")).textContent, message);
  const book = screen.getByRole<HTMLButtonElement>("button", { name: "Book" });
  assert.equal(book.disabled, true);
  await user.click(book);
  assert.equal(fetchMock.mock.calls.length, 1);
});
