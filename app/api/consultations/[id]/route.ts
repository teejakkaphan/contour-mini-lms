import { apiError } from "@/lib/api/response";
import { isConsultationId } from "@/lib/consultations/utils";
import { getApiSession, getEffectivePermissions } from "../../_shared/supabase";
import {
  consultationFields,
  parseScheduledAt,
  readConsultationBody,
  withConsultationActions,
} from "../shared";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return apiError("Authentication required", 401);

  const { id } = await context.params;
  if (!isConsultationId(id)) return apiError("Invalid consultation ID", 400);

  const [{ data, error }, permissions] = await Promise.all([
    session.supabase
      .from("consultations")
      .select(`${consultationFields}, student_id`)
      .eq("id", id)
      .maybeSingle(),
    getEffectivePermissions(session.supabase),
  ]);

  if (error || !permissions) return apiError("Could not load consultation", 500);
  if (!data) return apiError("Consultation not found", 404);

  return Response.json(
    withConsultationActions(data, session.userId, permissions.includes("consultations.update_own")),
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return apiError("Authentication required", 401);

  const { id } = await context.params;
  if (!isConsultationId(id)) {
    return apiError("Invalid consultation ID", 400);
  }

  const body = await readConsultationBody(request);
  if (!body) return apiError("Expected a JSON object", 400);

  const fields = Object.keys(body);
  if (!fields.length || fields.some((field) => field !== "scheduled_at" && field !== "status")) {
    return apiError("Provide scheduled_at, status, or both", 400);
  }

  const updates: { scheduled_at?: string; status?: string } = {};
  if ("scheduled_at" in body) {
    const scheduledAt = parseScheduledAt(body.scheduled_at);
    if (!scheduledAt) return apiError("Provide a scheduled time with a timezone", 400);
    updates.scheduled_at = scheduledAt;
  }
  if ("status" in body) {
    const { status } = body;
    if (status !== "incomplete" && status !== "complete" && status !== "cancelled") {
      return apiError("Invalid consultation status", 400);
    }
    updates.status = status;
  }

  const { data, error } = await session.supabase
    .from("consultations")
    .update(updates)
    .eq("id", id)
    .select(consultationFields)
    .maybeSingle();

  if (error?.code === "42501") return apiError("Update is forbidden", 403);
  if (error) {
    console.error("Consultation update failed", { code: error.code, message: error.message });
    return apiError("Could not update consultation", 500);
  }
  if (!data) return apiError("Consultation not found", 404);

  return Response.json(data);
}
