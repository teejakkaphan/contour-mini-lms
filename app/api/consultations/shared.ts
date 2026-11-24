export const consultationFields =
  "id, first_name, last_name, reason, scheduled_at, status";

export function withConsultationActions<T extends { student_id: string }>(
  { student_id, ...consultation }: T,
  userId: string,
  canUpdateOwn: boolean,
) {
  return {
    ...consultation,
    actions: canUpdateOwn && student_id === userId ? ["consultations.update_own"] : [],
  };
}

export async function readConsultationBody(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0];
  if (contentType?.trim().toLowerCase() !== "application/json") return null;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  return body as Record<string, unknown>;
}

export function parseScheduledAt(value: unknown) {
  if (typeof value !== "string") return null;

  const match = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;

  const calendarDate = new Date(`${match[1]}T00:00:00Z`);
  const scheduledAt = new Date(value);
  if (
    !Number.isFinite(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== match[1] ||
    !Number.isFinite(scheduledAt.getTime())
  ) return null;

  return scheduledAt.toISOString();
}
