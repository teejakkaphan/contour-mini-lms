"use client";

import Link from "next/link";
import { formatConsultationTime } from "@/lib/consultations/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  type ConsultationListItem,
  ConsultationApiError,
  getConsultations,
} from "@/lib/api/consultations";

type ConsultationList =
  | { state: "loading" }
  | { state: "signed-out" }
  | { state: "error" }
  | { state: "loaded"; consultations: ConsultationListItem[] };

export function ConsultationsTable() {
  const [list, setList] = useState<ConsultationList>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadConsultations() {
      try {
        const consultations = await getConsultations(controller.signal);
        if (!controller.signal.aborted)
          setList({ state: "loaded", consultations });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ConsultationApiError && error.status === 401) {
          setList({ state: "signed-out" });
        } else {
          setList({ state: "error" });
        }
      }
    }

    void loadConsultations();
    return () => controller.abort();
  }, []);

  if (list.state === "loading") return <output>Loading consultations…</output>;
  if (list.state === "signed-out") {
    return (
      <p>
        <Link href="/auth/login" className="underline">
          Sign in
        </Link>{" "}
        to view consultations.
      </p>
    );
  }
  if (list.state === "error")
    return <p role="alert">Could not load consultations.</p>;
  if (list.consultations.length === 0) return <p>No consultations yet.</p>;
  const shouldShowActionsColumn = list.consultations.some(({ actions }) =>
    actions.includes("reschedule"),
  );

  return (
    <div className="overflow-x-auto rounded-md border">
      <table
        aria-labelledby="consultations-heading"
        className="w-full text-left text-sm"
      >
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Student
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Reason
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
              Scheduled time
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            {shouldShowActionsColumn && (
              <th scope="col" className="px-4 py-3 font-medium">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {list.consultations.map((consultation) => (
            <tr key={consultation.id} className="border-t">
              <td className="px-4 py-3">
                {consultation.first_name} {consultation.last_name}
              </td>
              <td className="min-w-40 break-words px-4 py-3">
                {consultation.reason}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <time dateTime={consultation.scheduled_at}>
                  {formatConsultationTime(consultation.scheduled_at)}
                </time>
              </td>
              <td className="px-4 py-3 capitalize">{consultation.status}</td>
              {shouldShowActionsColumn && (
                <td className="px-4 py-3">
                  {consultation.actions.includes("reschedule") && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/booking/${consultation.id}`}>
                        Reschedule
                      </Link>
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
