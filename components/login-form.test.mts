// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { LoginForm } from "./login-form";

const { signInWithPassword, replace, refresh } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signInWithPassword } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test("refreshes the shared layout after successful login", async () => {
  const { promise, resolve } = Promise.withResolvers<{ error: null }>();
  signInWithPassword.mockReturnValue(promise);
  render(createElement(LoginForm));

  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.test" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  expect(refresh).not.toHaveBeenCalled();

  resolve({ error: null });
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(replace).toHaveBeenCalledExactlyOnceWith("/dashboard");
});
