import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type {
  ApprovalGrant,
  PaymentIntent,
  PaymentRecord,
  PolicyDecision,
  SpendingPolicy,
} from "./types.js";

const intentSchema = z.object({
  requestId: z.string().min(1),
  recipient: z.string().regex(/^(0\.0\.\d+|0x[a-fA-F0-9]{40})$/),
  amount: z.number().positive().finite(),
  asset: z.enum(["HBAR", "USDC"]),
  purpose: z.string().min(1),
  requestedAt: z.string().datetime(),
  approvalToken: z.string().min(1).optional(),
});

export class PolicyEngine {
  constructor(
    private readonly policy: SpendingPolicy,
    private readonly history: PaymentRecord[] = [],
    private readonly approvals: ApprovalGrant[] = [],
  ) {}

  evaluate(input: PaymentIntent, evaluatedAt = new Date()): PolicyDecision {
    const parsed = intentSchema.safeParse(input);
    if (!parsed.success) {
      return this.decision(input.requestId ?? "unknown", evaluatedAt, false, "INVALID_INTENT", parsed.error.issues[0]?.message ?? "Invalid payment intent");
    }

    const intent = parsed.data;
    if (!this.policy.allowedRecipients.includes(intent.recipient)) {
      return this.decision(intent.requestId, evaluatedAt, false, "RECIPIENT_NOT_ALLOWED", "Recipient is not on the policy allowlist");
    }

    if (!this.policy.allowedPurposes.includes(intent.purpose)) {
      return this.decision(intent.requestId, evaluatedAt, false, "PURPOSE_NOT_ALLOWED", "Payment purpose is not allowed");
    }

    const maxSingle = this.policy.maxSinglePayment[intent.asset];
    if (maxSingle !== undefined && intent.amount > maxSingle) {
      return this.decision(intent.requestId, evaluatedAt, false, "SINGLE_PAYMENT_LIMIT", `Payment exceeds the ${maxSingle} ${intent.asset} single-payment limit`);
    }

    const { start, end } = this.policy.activeHoursUtc;
    if (!isActiveHour(evaluatedAt.getUTCHours(), start, end)) {
      return this.decision(intent.requestId, evaluatedAt, false, "OUTSIDE_ACTIVE_HOURS", `Payments are allowed only from ${start}:00 to ${end}:00 UTC`);
    }

    const dailyLimit = this.policy.dailyLimit[intent.asset];
    const spentToday = this.history
      .filter((record) => record.asset === intent.asset && isSameUtcDay(new Date(record.executedAt), evaluatedAt))
      .reduce((sum, record) => sum + record.amount, 0);
    if (dailyLimit !== undefined && spentToday + intent.amount > dailyLimit) {
      return this.decision(intent.requestId, evaluatedAt, false, "DAILY_LIMIT", `Payment would exceed the ${dailyLimit} ${intent.asset} daily limit`);
    }

    const threshold = this.policy.approvalThreshold[intent.asset];
    if (threshold !== undefined && intent.amount >= threshold && !this.hasValidApproval(intent, evaluatedAt)) {
      return this.decision(intent.requestId, evaluatedAt, false, "HUMAN_APPROVAL_REQUIRED", `Payments of ${threshold} ${intent.asset} or more require a matching unexpired approval token`);
    }

    return this.decision(intent.requestId, evaluatedAt, true, "ALLOW", "Payment satisfies every deterministic policy rule");
  }

  private hasValidApproval(intent: PaymentIntent, evaluatedAt: Date): boolean {
    if (!intent.approvalToken) return false;
    return this.approvals.some((grant) => {
      if (grant.requestId !== intent.requestId || new Date(grant.expiresAt) <= evaluatedAt) return false;
      return safeStringEqual(grant.token, intent.approvalToken!);
    });
  }

  private decision(
    requestId: string,
    evaluatedAt: Date,
    allowed: boolean,
    code: PolicyDecision["code"],
    reason: string,
  ): PolicyDecision {
    const base = {
      allowed,
      code,
      reason,
      requestId,
      policyId: this.policy.policyId,
      evaluatedAt: evaluatedAt.toISOString(),
    };
    return {
      ...base,
      auditDigest: createHash("sha256").update(JSON.stringify(base)).digest("hex"),
    };
  }
}

function isSameUtcDay(left: Date, right: Date): boolean {
  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth()
    && left.getUTCDate() === right.getUTCDate();
}

function isActiveHour(hour: number, start: number, end: number): boolean {
  if (start === end) return true;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

function safeStringEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}
