import { apiError } from "@/lib/api/response";
import { getApiSession, getEffectivePermissions } from "../_shared/supabase";
import {
  consultationFields,
  parseScheduledAt,
  readConsultationBody,
  withConsultationActions,
} from "./shared";

export async function GET() {
  const session = await getApiSession();
  if (!session) return apiError("Authentication required", 401);

  const [{ data, error }, permissions] = await Promise.all([
    session.supabase
      .from("consultations")
      .select(`${consultationFields}, student_id`)
      .order("scheduled_at")
      .order("id"),
    getEffectivePermissions(session.supabase),
  ]);

  if (error || !permissions) return apiError("Could not load consultations", 500);

  const canUpdateOwn = permissions.includes("consultations.update_own");
  const consultations = data.map((row) => withConsultationActions(row, session.userId, canUpdateOwn));

  return Response.json(consultations, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) return apiError("Authentication required", 401);

  const body = await readConsultationBody(request);
  if (!body) return apiError("Expected a JSON object", 400);

  const { first_name, last_name, reason } = body;
  const scheduledAt = parseScheduledAt(body.scheduled_at);
  if (
    typeof first_name !== "string" || !first_name.trim() ||
    typeof last_name !== "string" || !last_name.trim() ||
    typeof reason !== "string" || !reason.trim() || !scheduledAt
  ) {
    return apiError(
      "First name, last name, reason, and a scheduled time with a timezone are required",
      400,
    );
  }

  const { data, error } = await session.supabase
    .from("consultations")
    .insert({
      student_id: session.userId,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      reason: reason.trim(),
      scheduled_at: scheduledAt,
    })
    .select(consultationFields)
    .single();

  if (error?.code === "42501") return apiError("Booking is forbidden", 403);
  if (error) return apiError("Could not book consultation", 500);

  return Response.json(data, { status: 201 });
}
