import { describe, test, expect } from "vitest";
import {
  cartValidationsGenerateRun,
  ERROR_MESSAGE,
  ERROR_TARGET,
} from "../src/cart_validations_generate_run";

const run = (email, step = "CHECKOUT_COMPLETION") =>
  cartValidationsGenerateRun({
    buyerJourney: { step },
    cart: { buyerIdentity: email === undefined ? null : { email } },
  });

const errorsOf = (result) => result.operations[0].validationAdd.errors;
const NG = [{ message: ERROR_MESSAGE, target: ERROR_TARGET }];

describe("CHECKOUT_COMPLETION", () => {
  test.each([
    ["1: ASCII", "test@example.com", []],
    ["2: ASCII with dot/plus", "test.user+01@example.co.jp", []],
    ["3: full-width local part", "ｔｅｓｔ@example.com", NG],
    ["4: full-width @", "test＠example.com", NG],
    ["5: full-width dot", "test@example．com", NG],
    ["6: katakana", "テスト@example.com", NG],
    ["7: hiragana", "testあ@example.com", NG],
    ["8: trailing ideographic space", "test@example.com　", NG],
    ["9: null", null, []],
    ["10: empty string", "", []],
    ["U+0080 boundary", "test\u0080@example.com", NG],
    ["U+007F boundary", "test\u007f@example.com", []],
  ])("%s", (_label, email, expected) => {
    expect(errorsOf(run(email))).toEqual(expected);
  });

  test("buyerIdentity missing (e.g. phone-only checkout) -> no error", () => {
    expect(errorsOf(run(undefined))).toEqual([]);
  });

  test("fixing the email after an error allows completion", () => {
    expect(errorsOf(run("テスト@example.com"))).toEqual(NG);
    expect(errorsOf(run("test@example.com"))).toEqual([]);
  });

  test("always returns exactly one validationAdd operation", () => {
    expect(run("test@example.com")).toEqual({
      operations: [{ validationAdd: { errors: [] } }],
    });
  });
});

describe("other buyer journey steps never return errors", () => {
  test.each(["CHECKOUT_INTERACTION", "CART_INTERACTION", null])("%s", (step) => {
    expect(errorsOf(run("テスト@example.com", step))).toEqual([]);
  });

  test("buyerJourney missing", () => {
    const result = cartValidationsGenerateRun({
      cart: { buyerIdentity: { email: "テスト@example.com" } },
    });
    expect(errorsOf(result)).toEqual([]);
  });
});
