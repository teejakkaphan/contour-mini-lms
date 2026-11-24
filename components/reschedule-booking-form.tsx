"use client";

import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";
import { ConsultationApiError, patchConsultation } from "@/lib/api/consultations";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function RescheduleBookingForm({ consultationId }: { consultationId: string }) {
  const router = useRouter();
  const [localTime, setLocalTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const scheduledAt = new Date(localTime);
  const isValid = Number.isFinite(scheduledAt.getTime());

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid || isSubmitting) return;

    setError("");
    setIsSubmitting(true);
    try {
      await patchConsultation(consultationId, { scheduled_at: scheduledAt.toISOString() });
      setLocalTime("");
      router.replace("/dashboard");
    } catch (error) {
      setError(error instanceof ConsultationApiError
        ? error.message
        : "Could not reschedule consultation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset disabled={isSubmitting} className="grid gap-3">
        <Label htmlFor="reschedule-time">New date and time (local)</Label>
        <Input
          id="reschedule-time"
          type="datetime-local"
          value={localTime}
          onChange={(event) => setLocalTime(event.target.value)}
          required
        />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? "Saving…" : "Save new time"}
        </Button>
      </fieldset>
    </form>
  );
}
