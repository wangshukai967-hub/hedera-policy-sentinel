import { describe, expect, it } from "vitest";
import { HederaSpendingPolicy, createPolicyMemo } from "../src/hedera-spending-policy.js";
import type { SpendingPolicy } from "../src/types.js";
import { InMemoryDecisionAuditSink } from "../src/audit-sink.js";

const now = new Date("2026-06-15T12:00:00.000Z");
const policy: SpendingPolicy = {
  policyId: "agent-kit-policy",
  allowedRecipients: ["0.0.1234"],
  allowedPurposes: ["hosting"],
  maxSinglePayment: { HBAR: 100 },
  dailyLimit: { HBAR: 200 },
  approvalThreshold: { HBAR: 50 },
  activeHoursUtc: { start: 8, end: 18 },
};

function hookParams(transfers: Array<{ accountId: string; amount: number }>, transactionMemo?: string) {
  return {
    context: {},
    rawParams: { transfers, transactionMemo },
    normalisedParams: {},
    client: {},
  } as never;
}

describe("HederaSpendingPolicy", () => {
  it("allows a compliant Agent Kit HBAR transfer", async () => {
    const guard = new HederaSpendingPolicy(policy, [], [], () => now);
    await expect(guard.postParamsNormalizationHook(
      hookParams([{ accountId: "0.0.1234", amount: 10 }], createPolicyMemo({ requestId: "ok", purpose: "hosting" })),
      "transfer_hbar_tool",
    )).resolves.toBeUndefined();
    expect(guard.decisions.at(-1)?.code).toBe("ALLOW");
  });

  it("blocks an Agent Kit transfer without the required approval", async () => {
    const guard = new HederaSpendingPolicy(policy, [], [], () => now);
    await expect(guard.postParamsNormalizationHook(
      hookParams([{ accountId: "0.0.1234", amount: 50 }], createPolicyMemo({ requestId: "blocked", purpose: "hosting" })),
      "transfer_hbar_tool",
    )).rejects.toThrow(/blocked by policy: Policy Sentinel Spending Policy/i);
    expect(guard.decisions.at(-1)?.code).toBe("HUMAN_APPROVAL_REQUIRED");
  });

  it("blocks transfers that omit the machine-readable policy memo", async () => {
    const guard = new HederaSpendingPolicy(policy, [], [], () => now);
    await expect(guard.postParamsNormalizationHook(
      hookParams([{ accountId: "0.0.1234", amount: 10 }]),
      "transfer_hbar_tool",
    )).rejects.toThrow();
  });

  it("records allow and block decisions through an audit sink", async () => {
    const sink = new InMemoryDecisionAuditSink();
    const guard = new HederaSpendingPolicy(policy, [], [], () => now, sink);
    await guard.postParamsNormalizationHook(
      hookParams([{ accountId: "0.0.1234", amount: 10 }], createPolicyMemo({ requestId: "audited", purpose: "hosting" })),
      "transfer_hbar_tool",
    );
    expect(sink.decisions).toHaveLength(1);
    expect(sink.decisions[0]?.auditDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks split transfers that cumulatively exceed the daily limit", async () => {
    const guard = new HederaSpendingPolicy(policy, [], [
      { token: "approved", requestId: "split", expiresAt: "2026-06-15T12:10:00.000Z" },
    ], () => now);
    await expect(guard.postParamsNormalizationHook(
      hookParams([
        { accountId: "0.0.1234", amount: 90 },
        { accountId: "0.0.1234", amount: 90 },
        { accountId: "0.0.1234", amount: 90 },
      ], createPolicyMemo({ requestId: "split", purpose: "hosting", approvalToken: "approved" })),
      "transfer_hbar_tool",
    )).rejects.toThrow();
    expect(guard.decisions.at(-1)?.code).toBe("DAILY_LIMIT");
  });
});
