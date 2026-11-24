const consultationsUrl = "/api/consultations";

export type CreateConsultationInput = {
  first_name: string;
  last_name: string;
  reason: string;
  scheduled_at: string;
};

export type Consultation = CreateConsultationInput & {
  id: string;
  status: "incomplete" | "complete" | "cancelled";
};

export type ConsultationListItem = Consultation & { actions: string[] };

export class ConsultationApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ConsultationApiError";
  }
}

async function readResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body?.error === "string" && body.error.trim()
        ? body.error
        : fallbackMessage;
    throw new ConsultationApiError(message, response.status);
  }

  return response.json();
}

export async function getConsultations(signal?: AbortSignal) {
  const response = await fetch(consultationsUrl, { signal });
  return readResponse<ConsultationListItem[]>(
    response,
    "Could not load consultations.",
  );
}

export async function getConsultationById(id: string, signal?: AbortSignal) {
  const response = await fetch(
    `${consultationsUrl}/${encodeURIComponent(id)}`,
    { signal },
  );
  return readResponse<ConsultationListItem>(
    response,
    "Could not load consultation.",
  );
}

export async function postConsultation(input: CreateConsultationInput) {
  const response = await fetch(consultationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readResponse<Consultation>(response, "Could not book consultation.");
}

export async function patchConsultation(
  id: string,
  changes: Partial<Pick<Consultation, "scheduled_at" | "status">>,
) {
  const response = await fetch(
    `${consultationsUrl}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    },
  );
  return readResponse<Consultation>(
    response,
    "Could not update consultation.",
  );
}
