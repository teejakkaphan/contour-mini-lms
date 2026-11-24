import { afterEach, expect, test, vi } from "vitest";
import {
  ConsultationApiError,
  postConsultation,
  getConsultations,
} from "./consultations";

const input = {
  first_name: "Ada",
  last_name: "Lovelace",
  reason: "Math revision",
  scheduled_at: "2026-11-24T21:00:00.000Z",
};
const booking = { ...input, id: "booking-1", status: "incomplete" };

afterEach(() => vi.unstubAllGlobals());

test("lists consultations and forwards the caller's abort signal", async () => {
  const { signal } = new AbortController();
  const fetchMock = vi.fn().mockResolvedValue(Response.json([booking]));
  vi.stubGlobal("fetch", fetchMock);

  await expect(getConsultations(signal)).resolves.toEqual([booking]);
  expect(fetchMock).toHaveBeenCalledWith("/api/consultations", { signal });
});

test("posts booking JSON and returns the created consultation", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json(booking, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(postConsultation(input)).resolves.toEqual(booking);
  expect(fetchMock).toHaveBeenCalledWith("/api/consultations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
});

test("keeps the API's error message and HTTP status", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    Response.json({ error: "Authentication required" }, { status: 401 }),
  ));

  await expect(getConsultations()).rejects.toBeInstanceOf(ConsultationApiError);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    Response.json({ error: "Booking is forbidden" }, { status: 403 }),
  ));
  await expect(postConsultation(input)).rejects.toMatchObject({
    message: "Booking is forbidden",
    status: 403,
  });
});

test("uses a fallback message for a non-JSON error response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })));

  await expect(getConsultations()).rejects.toMatchObject({
    message: "Could not load consultations.",
    status: 503,
  });
});

test("propagates cancelled fetches", async () => {
  const controller = new AbortController();
  controller.abort();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(controller.signal.reason));

  await expect(getConsultations(controller.signal)).rejects.toBe(controller.signal.reason);
});
