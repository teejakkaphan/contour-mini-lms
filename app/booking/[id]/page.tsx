import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getApiSession, getEffectivePermissions } from "@/app/api/_shared/supabase";
import { isConsultationId } from "@/lib/consultations/validation";
import { RescheduleBookingForm } from "@/components/reschedule-booking-form";

export default async function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isConsultationId(id)) notFound();

  const session = await getApiSession();
  if (!session) redirect("/auth/login");

  const permissions = await getEffectivePermissions(session.supabase);
  if (!permissions) throw new Error("Could not load consultation permissions.");
  if (!permissions.includes("consultations.update_own")) notFound();

  const { data, error } = await session.supabase
    .from("consultations")
    .select("reason, scheduled_at")
    .eq("id", id)
    .eq("student_id", session.userId)
    .maybeSingle();

  if (error) throw new Error("Could not load consultation.");
  if (!data) notFound();

  const currentTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(data.scheduled_at));

  return (
    <section className="mx-auto grid w-full max-w-md gap-4">
      <Link href="/dashboard" className="text-sm underline underline-offset-4">
        Back to consultations
      </Link>
      <h1 className="text-2xl font-bold">Reschedule consultation</h1>
      <p>{data.reason}</p>
      <p className="text-sm text-muted-foreground">
        Currently scheduled for <time dateTime={data.scheduled_at}>{currentTime} UTC</time>
      </p>
      <RescheduleBookingForm consultationId={id} />
    </section>
  );
}
