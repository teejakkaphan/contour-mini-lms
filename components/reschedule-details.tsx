"use client";

import Link from "next/link";
import { canManageConsultation, formatConsultationTime } from "@/lib/consultations/utils";
import { useEffect, useState } from "react";
import { RescheduleBookingForm } from "@/components/reschedule-booking-form";
import { ConsultationApiError, getConsultationById, type ConsultationListItem } from "@/lib/api/consultations";

type Details =
  | { state: "loading" | "unavailable" | "signed-out" | "error" }
  | { state: "ready"; consultation: ConsultationListItem };

export function RescheduleDetails({ consultationId }: { consultationId: string }) {
  const [details, setDetails] = useState<Details>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const consultation = await getConsultationById(consultationId, controller.signal);
        if (controller.signal.aborted) return;
        setDetails(canManageConsultation(consultation)
          ? { state: "ready", consultation }
          : { state: "unavailable" });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ConsultationApiError && error.status === 401) {
          setDetails({ state: "signed-out" });
        } else if (error instanceof ConsultationApiError && error.status === 404) {
          setDetails({ state: "unavailable" });
        } else {
          setDetails({ state: "error" });
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [consultationId]);

  if (details.state === "loading") return <output>Loading consultation…</output>;
  if (details.state === "signed-out") {
    return <Link href="/auth/login" className="underline">Sign in to reschedule</Link>;
  }
  if (details.state === "unavailable") return <p role="alert">Consultation unavailable for rescheduling.</p>;
  if (details.state !== "ready") return <p role="alert">Could not load consultation.</p>;

  const { reason, scheduled_at } = details.consultation;
  return (
    <>
      <p>{reason}</p>
      <p className="text-sm text-muted-foreground">
        Currently scheduled for <time dateTime={scheduled_at}>{formatConsultationTime(scheduled_at)}</time>
      </p>
      <RescheduleBookingForm consultationId={consultationId} />
    </>
  );
}
