import { describe, expect, it } from "vitest";
import { PolicyEngine } from "../src/policy-engine.js";
import type { PaymentIntent, SpendingPolicy } from "../src/types.js";

const now = new Date("2026-06-15T12:00:00.000Z");
const policy: SpendingPolicy = {
  policyId: "test-policy",
  allowedRecipients: ["0.0.1234"],
  allowedPurposes: ["hosting"],
  maxSinglePayment: { HBAR: 100 },
  dailyLimit: { HBAR: 150 },
  approvalThreshold: { HBAR: 50 },
  activeHoursUtc: { start: 8, end: 18 },
};

const baseIntent: PaymentIntent = {
  requestId: "request-1",
  recipient: "0.0.1234",
  amount: 10,
  asset: "HBAR",
  purpose: "hosting",
  requestedAt: now.toISOString(),
};

describe("PolicyEngine", () => {
  it("allows a compliant payment and creates an audit digest", () => {
    const decision = new PolicyEngine(policy).evaluate(baseIntent, now);
    expect(decision.allowed).toBe(true);
    expect(decision.code).toBe("ALLOW");
    expect(decision.auditDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks recipients outside the allowlist", () => {
    const decision = new PolicyEngine(policy).evaluate({ ...baseIntent, recipient: "0.0.9999" }, now);
    expect(decision.code).toBe("RECIPIENT_NOT_ALLOWED");
  });

  it("blocks disallowed purposes", () => {
    const decision = new PolicyEngine(policy).evaluate({ ...baseIntent, purpose: "unapproved" }, now);
    expect(decision.code).toBe("PURPOSE_NOT_ALLOWED");
  });

  it("blocks payments over the single-payment limit", () => {
    const decision = new PolicyEngine(policy).evaluate({ ...baseIntent, amount: 101 }, now);
    expect(decision.code).toBe("SINGLE_PAYMENT_LIMIT");
  });

  it("blocks payments that exceed the cumulative daily limit", () => {
    const engine = new PolicyEngine(policy, [
      { requestId: "earlier", amount: 120, asset: "HBAR", executedAt: "2026-06-15T09:00:00.000Z" },
    ]);
    const decision = engine.evaluate({ ...baseIntent, amount: 40 }, now);
    expect(decision.code).toBe("DAILY_LIMIT");
  });

  it("requires human approval at the configured threshold", () => {
    const decision = new PolicyEngine(policy).evaluate({ ...baseIntent, amount: 50 }, now);
    expect(decision.code).toBe("HUMAN_APPROVAL_REQUIRED");
  });

  it("accepts a matching unexpired human approval", () => {
    const engine = new PolicyEngine(policy, [], [
      { token: "approved", requestId: "request-1", expiresAt: "2026-06-15T12:10:00.000Z" },
    ]);
    const decision = engine.evaluate({ ...baseIntent, amount: 50, approvalToken: "approved" }, now);
    expect(decision.code).toBe("ALLOW");
  });

  it("blocks payments outside active UTC hours", () => {
    const decision = new PolicyEngine(policy).evaluate(baseIntent, new Date("2026-06-15T20:00:00.000Z"));
    expect(decision.code).toBe("OUTSIDE_ACTIVE_HOURS");
  });

  it("supports active-hour windows that cross midnight", () => {
    const overnight = { ...policy, activeHoursUtc: { start: 22, end: 6 } };
    expect(new PolicyEngine(overnight).evaluate(baseIntent, new Date("2026-06-15T23:00:00.000Z")).allowed).toBe(true);
    expect(new PolicyEngine(overnight).evaluate(baseIntent, new Date("2026-06-15T12:00:00.000Z")).code).toBe("OUTSIDE_ACTIVE_HOURS");
  });

  it("rejects malformed Hedera recipients", () => {
    const decision = new PolicyEngine(policy).evaluate({ ...baseIntent, recipient: "not-an-account" }, now);
    expect(decision.code).toBe("INVALID_INTENT");
  });
});
