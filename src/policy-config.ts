import type { SpendingPolicy } from "./types.js";

export const treasuryPolicy: SpendingPolicy = {
  policyId: "policy-sentinel-demo-v1",
  allowedRecipients: [
    "0.0.800800"
  ],
  allowedPurposes: [
    "cloud-infrastructure",
    "approved-vendor",
    "contractor-payment"
  ],
  maxSinglePayment: {
    HBAR: 1_000,
    USDC: 500
  },
  dailyLimit: {
    HBAR: 2_000,
    USDC: 1_000
  },
  approvalThreshold: {
    HBAR: 250,
    USDC: 100
  },
  activeHoursUtc: {
    start: 8,
    end: 18
  }
};
