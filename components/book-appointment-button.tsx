"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyPermissions } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";

export function BookAppointmentButton() {
  const [canBook, setCanBook] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBookingPermission() {
      try {
        const { permissions } = await getMyPermissions(controller.signal);
        if (!controller.signal.aborted) {
          setCanBook(permissions.includes("consultations.create_own"));
        }
      } catch {
        if (!controller.signal.aborted) setCanBook(false);
      }
    }

    void loadBookingPermission();
    return () => controller.abort();
  }, []);

  if (!canBook) return null;

  return (
    <Button asChild>
      <Link href="/booking">Book an appointment</Link>
    </Button>
  );
}
