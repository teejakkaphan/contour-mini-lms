import Link from "next/link";
import { notFound } from "next/navigation";
import { isConsultationId } from "@/lib/consultations/utils";
import { RescheduleDetails } from "@/components/reschedule-details";

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isConsultationId(id)) notFound();

  return (
    <section className="mx-auto grid w-full max-w-md gap-4">
      <Link href="/dashboard" className="text-sm underline underline-offset-4">
        Back to consultations
      </Link>
      <h1 className="text-2xl font-bold">Reschedule consultation</h1>
      <RescheduleDetails key={id} consultationId={id} />
    </section>
  );
}
