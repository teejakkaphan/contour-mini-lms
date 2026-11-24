// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { AuthButton } from "./auth-button";

const { onAuthStateChange, unsubscribe } = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { onAuthStateChange } }) }));
vi.mock("./logout-button", () => ({ LogoutButton: () => null }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

test("loads the profile from the API and clears it after logout", async () => {
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({ first_name: "Ada", last_name: "Lovelace", email: "ada@example.test" }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { unmount } = render(createElement(AuthButton));

  expect(await screen.findByText("Hey, Ada!")).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledWith("/api/me", { signal: expect.any(AbortSignal), cache: "no-store" });
  act(() => onAuthStateChange.mock.calls[0][0]("SIGNED_OUT"));
  expect(screen.queryByText("Hey, Ada!")).toBeNull();
  expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();

  unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

test("reloads the profile after a sign-in event", async () => {
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ first_name: null, last_name: null, email: "ada@example.test" }));
  vi.stubGlobal("fetch", fetchMock);
  await act(async () => { render(createElement(AuthButton)); });

  expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
  act(() => onAuthStateChange.mock.calls[0][0]("SIGNED_IN"));
  expect(await screen.findByText("Hey, there!")).toBeTruthy();
});
