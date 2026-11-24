import { ConsultationsTable } from "./consultations-table";

export default function DashboardPage() {
  return (
    <section aria-labelledby="consultations-heading" className="grid w-full min-w-0 gap-4">
      <h1 id="consultations-heading" className="text-2xl font-bold">
        Consultations
      </h1>
      <ConsultationsTable />
    </section>
  );
}
