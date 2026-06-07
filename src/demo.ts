import { PolicyEngine } from "./policy-engine.js";
import type { PaymentIntent, SpendingPolicy } from "./types.js";

const now = new Date("2026-06-15T12:00:00.000Z");
const policy: SpendingPolicy = {
  policyId: "ops-treasury-v1",
  allowedRecipients: ["0.0.800800"],
  allowedPurposes: ["cloud-infrastructure", "approved-vendor"],
  maxSinglePayment: { HBAR: 1_000, USDC: 500 },
  dailyLimit: { HBAR: 2_000, USDC: 1_000 },
  approvalThreshold: { HBAR: 250, USDC: 100 },
  activeHoursUtc: { start: 8, end: 18 },
};

const intents: PaymentIntent[] = [
  {
    requestId: "demo-allow",
    recipient: "0.0.800800",
    amount: 50,
    asset: "HBAR",
    purpose: "cloud-infrastructure",
    requestedAt: now.toISOString(),
  },
  {
    requestId: "demo-block",
    recipient: "0.0.800800",
    amount: 300,
    asset: "HBAR",
    purpose: "cloud-infrastructure",
    requestedAt: now.toISOString(),
  },
  {
    requestId: "demo-approved",
    recipient: "0.0.800800",
    amount: 300,
    asset: "HBAR",
    purpose: "approved-vendor",
    requestedAt: now.toISOString(),
    approvalToken: "human-approved-demo",
  },
];

const engine = new PolicyEngine(policy, [], [
  {
    token: "human-approved-demo",
    requestId: "demo-approved",
    expiresAt: "2026-06-15T12:15:00.000Z",
  },
]);

for (const intent of intents) {
  console.log(JSON.stringify(engine.evaluate(intent, now), null, 2));
}
