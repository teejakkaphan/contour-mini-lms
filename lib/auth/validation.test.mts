import { expect, test } from "vitest";
import { parseSignupInput } from "./validation";

const validInput = {
  first_name: "Ada",
  last_name: "Lovelace",
  email: "Ada+signup@example.co.nz",
  password: "abc123",
};

test.each([null, undefined, [], "signup", 42])(
  "rejects a non-object body (%j)",
  (body) => {
    expect(parseSignupInput(body)).toEqual({
      ok: false,
      error: "Expected a JSON object",
    });
  },
);

test.each([
  ["first_name", "First name is required"],
  ["last_name", "Last name is required"],
  ["email", "Enter a valid email address"],
  ["password", "Password must contain at least 6 characters and cannot be all whitespace"],
] as const)("rejects missing, non-string, and blank %s values", (field, error) => {
  const { [field]: omittedField, ...missingField } = validInput;
  expect(omittedField).toBeDefined();

  for (const input of [missingField, { ...validInput, [field]: 42 }, { ...validInput, [field]: "      " }]) {
    expect(parseSignupInput(input)).toEqual({ ok: false, error });
  }
});

test.each(["ada", "ada@example", "ada@example..com", "ada@-example.com"])(
  "rejects an invalid email (%s)",
  (email) => {
    expect(parseSignupInput({ ...validInput, email })).toEqual({
      ok: false,
      error: "Enter a valid email address",
    });
  },
);

test("rejects five-character passwords and accepts six-character passwords", () => {
  expect(parseSignupInput({ ...validInput, password: "abc12" })).toEqual({
    ok: false,
    error: "Password must contain at least 6 characters and cannot be all whitespace",
  });
  expect(parseSignupInput(validInput)).toEqual({ ok: true, input: validInput });
});

test("trims names and email, preserves password whitespace, and omits extra fields", () => {
  const password = " abc123 ";
  expect(parseSignupInput({
    first_name: " Ada ",
    last_name: " Lovelace ",
    email: " Ada+signup@example.co.nz ",
    password,
    role: "admin",
  })).toEqual({ ok: true, input: { ...validInput, password } });
});
