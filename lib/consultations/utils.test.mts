import { expect, test } from "vitest";
import { formatConsultationTime, isConsultationId } from "./utils";

const consultationId = "021a1563-09c8-4a86-a623-44cd3b3e7f4a";

test("accepts UUIDs in lowercase and uppercase", () => {
  expect(isConsultationId(consultationId)).toBe(true);
  expect(isConsultationId(consultationId.toUpperCase())).toBe(true);
});

test.each(["", "booking-1", consultationId.replaceAll("-", ""), ` ${consultationId}`, consultationId.replace("a", "g")])(
  "rejects an invalid consultation ID (%j)",
  (id) => expect(isConsultationId(id)).toBe(false),
);

test("formats the appointment in the current timezone with a short timezone label", () => {
  const scheduledAt = "2026-11-24T21:00:00Z";
  const localDate = new Date(scheduledAt);
  const expected = localDate.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  expect(formatConsultationTime(scheduledAt)).toBe(expected);
  expect(formatConsultationTime("2026-11-25T10:00:00+13:00")).toBe(expected);
});
