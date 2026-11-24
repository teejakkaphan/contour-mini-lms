const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function formatConsultationTime(scheduledAt: string) {
  return dateTimeFormat.format(new Date(scheduledAt));
}

export function isConsultationId(id: string) {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id);
}

export function canManageConsultation({ actions, status }: { actions: string[]; status: string }) {
  return status !== "cancelled" && actions.includes("consultations.update_own");
}
