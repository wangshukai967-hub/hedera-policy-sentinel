import {
  AbstractHook,
  type PostSecondaryActionParams,
} from "@hashgraph/hedera-agent-kit";
import { coreAccountPluginToolNames } from "@hashgraph/hedera-agent-kit/plugins";
import type { PaymentRecord } from "./types.js";

interface RawTransferParams {
  transfers?: Array<{ amount: number }>;
  transactionMemo?: string;
}

export class PaymentHistoryHook extends AbstractHook {
  readonly name = "Policy Sentinel Payment History";
  readonly description = "Records completed HBAR transfers for cumulative daily-limit enforcement.";
  readonly relevantTools: string[] = [
    coreAccountPluginToolNames.TRANSFER_HBAR_TOOL,
    coreAccountPluginToolNames.TRANSFER_HBAR_WITH_ALLOWANCE_TOOL,
  ];

  constructor(
    private readonly history: PaymentRecord[],
    private readonly clock: () => Date = () => new Date(),
  ) {
    super();
  }

  async postToolExecutionHook(params: PostSecondaryActionParams, method: string): Promise<void> {
    if (!this.relevantTools.includes(method)) return;
    const raw = params.rawParams as RawTransferParams;
    const requestId = requestIdFromMemo(raw.transactionMemo) ?? `completed-${this.clock().getTime()}`;
    const executedAt = this.clock().toISOString();

    for (const transfer of raw.transfers ?? []) {
      if (Number.isFinite(transfer.amount) && transfer.amount > 0) {
        this.history.push({
          requestId,
          amount: transfer.amount,
          asset: "HBAR",
          executedAt,
        });
      }
    }
  }
}

function requestIdFromMemo(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as { policy?: { requestId?: string } };
    return value.policy?.requestId;
  } catch {
    return undefined;
  }
}
