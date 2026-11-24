"use client";

import { type SubmitEvent, useState } from "react";
import {
  ConsultationApiError,
  postConsultation,
} from "@/lib/api/consultations";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

function readBookingForm(fields: FormData) {
  const firstName = fields.get("first_name");
  const lastName = fields.get("last_name");
  const reason = fields.get("reason");
  const localTime = fields.get("scheduled_at");

  if (
    typeof firstName !== "string" ||
    !firstName.trim() ||
    typeof lastName !== "string" ||
    !lastName.trim() ||
    typeof reason !== "string" ||
    !reason.trim() ||
    typeof localTime !== "string" ||
    !localTime.trim()
  )
    return null;

  const scheduledAt = new Date(localTime);
  if (!Number.isFinite(scheduledAt.getTime())) return null;

  return {
    first_name: firstName,
    last_name: lastName,
    reason,
    scheduled_at: scheduledAt.toISOString(),
  };
}

export function CreateBookingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");
  const [isBooked, setIsBooked] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const booking = readBookingForm(new FormData(form));
    setError("");
    setIsBooked(false);

    if (!booking) {
      setError(
        "Fill in all fields and enter a valid consultation date and time.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await postConsultation(booking);
      form.reset();
      setIsBooked(true);
    } catch (error) {
      setError(
        error instanceof ConsultationApiError
          ? error.message
          : "Could not book consultation. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-2 col-span-full md:col-start-2 md:col-span-3"
      onChange={(event) => {
        setIsComplete(
          readBookingForm(new FormData(event.currentTarget)) !== null,
        );
      }}
      onReset={() => setIsComplete(false)}
      onSubmit={handleSubmit}
    >
      <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="first-name">First name</Label>
          <Input
            id="first-name"
            name="first_name"
            autoComplete="given-name"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="last-name">Last name</Label>
          <Input
            id="last-name"
            name="last_name"
            autoComplete="family-name"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="booking-reason">Reason for consultation</Label>
          <Input id="booking-reason" name="reason" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="booking-time">Date and time (local)</Label>
          <Input
            id="booking-time"
            name="scheduled_at"
            type="datetime-local"
            required
          />
        </div>
        <Button type="submit" disabled={!isComplete || isSubmitting}>
          {isSubmitting ? "Booking…" : "Book"}
        </Button>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {isBooked && <output className="text-sm">Consultation booked.</output>}
    </form>
  );
}
