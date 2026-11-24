"use client";

import { type SubmitEvent, useEffect, useState } from "react";
import { getMe } from "@/lib/api/auth";
import {
  ConsultationApiError,
  postConsultation,
} from "@/lib/api/consultations";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

function readBookingForm(fields: FormData) {
  const reason = fields.get("reason");
  const localTime = fields.get("scheduled_at");

  if (
    typeof reason !== "string" ||
    !reason.trim() ||
    typeof localTime !== "string" ||
    !localTime.trim()
  )
    return null;

  const scheduledAt = new Date(localTime);
  if (!Number.isFinite(scheduledAt.getTime())) return null;

  return {
    reason,
    scheduled_at: scheduledAt.toISOString(),
  };
}

export function CreateBookingForm() {
  const [accountName, setAccountName] = useState<{ first_name: string; last_name: string } | null>(null);
  const [profileError, setProfileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");
  const [isBooked, setIsBooked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAccountName() {
      try {
        const profile = await getMe(controller.signal);
        if (controller.signal.aborted) return;

        const firstName = profile.first_name?.trim();
        const lastName = profile.last_name?.trim();
        if (!firstName || !lastName) {
          setProfileError("Your account needs a first and last name before you can book.");
          return;
        }

        setAccountName({ first_name: firstName, last_name: lastName });
      } catch {
        if (!controller.signal.aborted) {
          setProfileError("Could not load your account details. Reload the page to try again.");
        }
      }
    }

    void loadAccountName();
    return () => controller.abort();
  }, []);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !accountName) return;

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
      await postConsultation({ ...accountName, ...booking });
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
        <Button type="submit" disabled={!accountName || !isComplete || isSubmitting}>
          {isSubmitting ? "Booking…" : "Book"}
        </Button>
      </fieldset>
      {!accountName && !profileError && <output className="text-sm">Loading account details…</output>}
      {profileError && <p role="alert" className="text-sm text-destructive">{profileError}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {isBooked && <output className="text-sm">Consultation booked.</output>}
    </form>
  );
}
