import { describe, expect, it } from "vitest";
import { PaymentHistoryHook } from "../src/payment-history-hook.js";
import type { PaymentRecord } from "../src/types.js";

describe("PaymentHistoryHook", () => {
  it("records completed HBAR transfers for future daily-limit checks", async () => {
    const history: PaymentRecord[] = [];
    const hook = new PaymentHistoryHook(history, () => new Date("2026-06-15T12:00:00.000Z"));
    await hook.postToolExecutionHook({
      context: {},
      rawParams: {
        transfers: [{ accountId: "0.0.1234", amount: 25 }],
        transactionMemo: JSON.stringify({ policy: { requestId: "paid-1", purpose: "hosting" } }),
      },
      normalisedParams: {},
      coreActionResult: {},
      toolResult: {},
      client: {},
    } as never, "transfer_hbar_tool");

    expect(history).toEqual([
      {
        requestId: "paid-1",
        amount: 25,
        asset: "HBAR",
        executedAt: "2026-06-15T12:00:00.000Z",
      },
    ]);
  });
});
