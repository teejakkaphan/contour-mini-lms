// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { BookAppointmentButton } from "@/components/book-appointment-button";
import { ConsultationsTable } from "@/components/consultations-table";
import DashboardPage from "./page";

vi.mock("@/components/book-appointment-button", () => ({ BookAppointmentButton: vi.fn(() => null) }));
vi.mock("@/components/consultations-table", () => ({ ConsultationsTable: vi.fn(() => null) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("renders the booking control and consultations table on the dashboard", () => {
  render(createElement(DashboardPage));

  expect(BookAppointmentButton).toHaveBeenCalled();
  expect(ConsultationsTable).toHaveBeenCalled();
});
