import { createClient } from "@/lib/supabase/server";

export const consultationFields =
  "id, first_name, last_name, reason, scheduled_at, status";

export async function getConsultationSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  return !error && userId ? { supabase, userId } : null;
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
