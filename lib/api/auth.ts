import type { SignupInput } from "@/lib/auth/validation";

export async function postSignup(input: SignupInput): Promise<{ requiresEmailConfirmation: boolean }> {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(typeof body?.error === "string" ? body.error : "Could not create account.");
  }

  return response.json();
}
