import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConsultationsTable } from "./consultations-table";

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
        <Button asChild>
          <Link href="/booking">Book an appointment</Link>
        </Button>
      </div>
      <ConsultationsTable />
    </section>
  );
}
