export function apiError(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}
