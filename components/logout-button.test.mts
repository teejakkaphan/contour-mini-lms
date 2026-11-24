// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { LogoutButton } from "./logout-button";

const { signOut, replace, refresh } = vi.hoisted(() => ({
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test("refreshes the server-rendered layout after a successful logout", async () => {
  const { promise, resolve } = Promise.withResolvers<{ error: null }>();
  signOut.mockReturnValue(promise);
  render(createElement(LogoutButton));
  fireEvent.click(screen.getByRole("button", { name: "Logout" }));

  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Signing out…" }).disabled).toBe(true);
  expect(refresh).not.toHaveBeenCalled();

  resolve({ error: null });
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(replace).toHaveBeenCalledExactlyOnceWith("/auth/login");
});

test("keeps the user on the page and offers a retry when sign-out fails", async () => {
  signOut.mockResolvedValue({ error: new Error("Sign-out failed") });
  render(createElement(LogoutButton));
  fireEvent.click(screen.getByRole("button", { name: "Logout" }));

  expect((await screen.findByRole("alert")).textContent).toBe("Could not sign out. Please try again.");
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Logout" }).disabled).toBe(false);
  expect(replace).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
});
