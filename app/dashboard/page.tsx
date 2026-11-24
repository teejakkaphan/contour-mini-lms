import { ConsultationsTable } from "@/components/consultations-table";
import { BookAppointmentButton } from "@/components/book-appointment-button";

export default function DashboardPage() {
  return (
    <section
      aria-labelledby="consultations-heading"
      className="grid w-full min-w-0 gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="consultations-heading" className="text-2xl font-bold">
          Consultations
        </h1>
        <BookAppointmentButton />
      </div>
      <ConsultationsTable />
    </section>
  );
}
