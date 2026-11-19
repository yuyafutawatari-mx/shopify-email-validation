// @ts-check

/**
 * @typedef {import("../generated/api").CartValidationsGenerateRunInput} CartValidationsGenerateRunInput
 * @typedef {import("../generated/api").CartValidationsGenerateRunResult} CartValidationsGenerateRunResult
 */

export const ERROR_MESSAGE =
  "メールアドレスは半角英数字・記号でご入力ください。";
export const ERROR_TARGET = "$.cart.buyerIdentity.email";

/**
 * U+0080 以上の文字（全角英数・全角記号・全角スペース・日本語など）を含むか判定する。
 * @param {string} email
 */
export const hasNonAscii = (email) => /[^\x00-\x7F]/.test(email);

/**
 * 注文確定時（CHECKOUT_COMPLETION）のみ、メールアドレスに非ASCII文字が含まれていればエラーを返す。
 * メールアドレスはログに出力しない。
 *
 * @param {CartValidationsGenerateRunInput} input
 * @returns {CartValidationsGenerateRunResult}
 */
export function cartValidationsGenerateRun(input) {
  const errors = [];
  const email = input.cart?.buyerIdentity?.email;

  if (
    input.buyerJourney?.step === "CHECKOUT_COMPLETION" &&
    typeof email === "string" &&
    hasNonAscii(email)
  ) {
    errors.push({ message: ERROR_MESSAGE, target: ERROR_TARGET });
  }

  return {
    operations: [
      {
        validationAdd: {
          errors,
        },
      },
    ],
  };
}
