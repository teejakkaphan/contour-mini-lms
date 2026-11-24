// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { ConsultationsTable } from "./consultations-table";
import DashboardPage from "./page";

vi.mock("./consultations-table", () => ({ ConsultationsTable: vi.fn(() => null) }));

afterEach(() => {
  cleanup();
  vi.mocked(ConsultationsTable).mockClear();
});

test("links to the booking page from the dashboard", () => {
  render(createElement(DashboardPage));

  const bookingLink = screen.getByRole("link", { name: "Book an appointment" });
  expect(bookingLink.getAttribute("href")).toBe("/booking");
});

test("renders the consultations table on the dashboard", () => {
  render(createElement(DashboardPage));

  expect(ConsultationsTable).toHaveBeenCalled();
});
