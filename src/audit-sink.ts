import { Client, TopicId, TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import type { PolicyDecision } from "./types.js";

export interface DecisionAuditSink {
  record(decision: PolicyDecision): Promise<void>;
}

export class InMemoryDecisionAuditSink implements DecisionAuditSink {
  readonly decisions: PolicyDecision[] = [];

  async record(decision: PolicyDecision): Promise<void> {
    this.decisions.push(decision);
  }
}

export class HcsDecisionAuditSink implements DecisionAuditSink {
  constructor(
    private readonly client: Client,
    private readonly topicId: string,
  ) {}

  async record(decision: PolicyDecision): Promise<void> {
    const message = JSON.stringify({
      schema: "hedera-policy-sentinel/decision/v1",
      ...decision,
    });
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(this.topicId))
      .setMessage(message);
    const response = await transaction.execute(this.client);
    await response.getReceipt(this.client);
  }
}
