// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { SignUpForm } from "./sign-up-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(cleanup);

test("enables signup only when all fields are valid and the passwords match", () => {
  render(createElement(SignUpForm));
  const submit = screen.getByRole<HTMLButtonElement>("button", { name: "Sign up" });
  const change = (label: string, value: string) => {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  };

  expect(submit.disabled).toBe(true);
  change("First name", "Ada");
  change("Last name", "Lovelace");
  change("Email", "ada@example.com");
  change("Password", "short");
  change("Confirm password", "short");
  expect(submit.disabled).toBe(true);

  change("Password", "long-enough");
  expect(submit.disabled).toBe(true);
  change("Confirm password", "long-enough");
  expect(submit.disabled).toBe(false);

  change("Email", "ada@example..com");
  expect(submit.disabled).toBe(true);
  change("Email", "ada@example.com");
  change("First name", " ");
  expect(submit.disabled).toBe(true);
});
