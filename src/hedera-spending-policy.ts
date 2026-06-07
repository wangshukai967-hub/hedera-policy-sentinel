import {
  AbstractPolicy,
  type PostParamsNormalizationParams,
} from "@hashgraph/hedera-agent-kit";
import { coreAccountPluginToolNames } from "@hashgraph/hedera-agent-kit/plugins";
import { PolicyEngine } from "./policy-engine.js";
import type { DecisionAuditSink } from "./audit-sink.js";
import type {
  ApprovalGrant,
  PaymentIntent,
  PaymentRecord,
  PolicyDecision,
  SpendingPolicy,
} from "./types.js";

interface RawHbarTransfer {
  accountId: string;
  amount: number;
}

interface RawTransferParams {
  transfers?: RawHbarTransfer[];
  transactionMemo?: string;
}

interface PolicyMemo {
  requestId: string;
  purpose: string;
  approvalToken?: string;
}

export class HederaSpendingPolicy extends AbstractPolicy {
  readonly name = "Policy Sentinel Spending Policy";
  readonly description = "Blocks Hedera HBAR transfers that violate deterministic treasury rules.";
  readonly relevantTools = [
    coreAccountPluginToolNames.TRANSFER_HBAR_TOOL,
    coreAccountPluginToolNames.TRANSFER_HBAR_WITH_ALLOWANCE_TOOL,
  ];
  readonly decisions: PolicyDecision[] = [];

  constructor(
    private readonly policy: SpendingPolicy,
    private readonly history: PaymentRecord[] = [],
    private readonly approvals: ApprovalGrant[] = [],
    private readonly clock: () => Date = () => new Date(),
    private readonly auditSink?: DecisionAuditSink,
  ) {
    super();
  }

  protected async shouldBlockPostParamsNormalization(
    allParams: PostParamsNormalizationParams,
    method: string,
  ): Promise<boolean> {
    const raw = allParams.rawParams as RawTransferParams;
    const memo = parsePolicyMemo(raw.transactionMemo);
    const transfers = raw.transfers ?? [];
    const evaluatedAt = this.clock();

    if (transfers.length === 0) {
      return this.recordInvalid(method, memo?.requestId ?? "missing-request", evaluatedAt, "No recipient transfers were provided");
    }

    if (!memo) {
      return this.recordInvalid(method, "missing-request", evaluatedAt, "A JSON policy memo with requestId and purpose is required");
    }

    const workingHistory = [...this.history];
    const engine = new PolicyEngine(this.policy, workingHistory, this.approvals);
    for (const transfer of transfers) {
      const intent: PaymentIntent = {
        requestId: memo.requestId,
        recipient: transfer.accountId,
        amount: transfer.amount,
        asset: "HBAR",
        purpose: memo.purpose,
        requestedAt: evaluatedAt.toISOString(),
        approvalToken: memo.approvalToken,
      };
      const decision = engine.evaluate(intent, evaluatedAt);
      await this.auditSink?.record(decision);
      this.decisions.push(decision);
      if (!decision.allowed) {
        console.warn(`[${this.name}] ${method} blocked: ${decision.code} - ${decision.reason}`);
        return true;
      }
      workingHistory.push({
        requestId: intent.requestId,
        amount: intent.amount,
        asset: intent.asset,
        executedAt: evaluatedAt.toISOString(),
      });
    }

    return false;
  }

  private async recordInvalid(method: string, requestId: string, evaluatedAt: Date, reason: string): Promise<true> {
    const decision = new PolicyEngine(this.policy).evaluate({
      requestId,
      recipient: "invalid",
      amount: 0,
      asset: "HBAR",
      purpose: "",
      requestedAt: evaluatedAt.toISOString(),
    }, evaluatedAt);
    const invalidDecision = { ...decision, reason: `${method}: ${reason}` };
    await this.auditSink?.record(invalidDecision);
    this.decisions.push(invalidDecision);
    return true;
  }
}

export function createPolicyMemo(memo: PolicyMemo): string {
  return JSON.stringify({
    policy: {
      requestId: memo.requestId,
      purpose: memo.purpose,
      ...(memo.approvalToken ? { approvalToken: memo.approvalToken } : {}),
    },
  });
}

function parsePolicyMemo(raw: string | undefined): PolicyMemo | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as { policy?: Partial<PolicyMemo> };
    if (!value.policy?.requestId || !value.policy.purpose) return undefined;
    return {
      requestId: value.policy.requestId,
      purpose: value.policy.purpose,
      approvalToken: value.policy.approvalToken,
    };
  } catch {
    return undefined;
  }
}
