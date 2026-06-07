export type Asset = "HBAR" | "USDC";

export interface PaymentIntent {
  requestId: string;
  recipient: string;
  amount: number;
  asset: Asset;
  purpose: string;
  requestedAt: string;
  approvalToken?: string;
}

export interface SpendingPolicy {
  policyId: string;
  allowedRecipients: string[];
  allowedPurposes: string[];
  maxSinglePayment: Partial<Record<Asset, number>>;
  dailyLimit: Partial<Record<Asset, number>>;
  approvalThreshold: Partial<Record<Asset, number>>;
  activeHoursUtc: {
    start: number;
    end: number;
  };
}

export interface PaymentRecord {
  requestId: string;
  amount: number;
  asset: Asset;
  executedAt: string;
}

export interface ApprovalGrant {
  token: string;
  requestId: string;
  expiresAt: string;
}

export type DecisionCode =
  | "ALLOW"
  | "RECIPIENT_NOT_ALLOWED"
  | "PURPOSE_NOT_ALLOWED"
  | "SINGLE_PAYMENT_LIMIT"
  | "DAILY_LIMIT"
  | "OUTSIDE_ACTIVE_HOURS"
  | "HUMAN_APPROVAL_REQUIRED"
  | "INVALID_INTENT";

export interface PolicyDecision {
  allowed: boolean;
  code: DecisionCode;
  reason: string;
  requestId: string;
  policyId: string;
  evaluatedAt: string;
  auditDigest: string;
}
