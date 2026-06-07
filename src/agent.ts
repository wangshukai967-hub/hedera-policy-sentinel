import { openai } from "@ai-sdk/openai";
import { AgentMode } from "@hashgraph/hedera-agent-kit";
import { HederaAIToolkit } from "@hashgraph/hedera-agent-kit-ai-sdk";
import { coreAccountPlugin } from "@hashgraph/hedera-agent-kit/plugins";
import { Client, PrivateKey } from "@hiero-ledger/sdk";
import { generateText, stepCountIs, wrapLanguageModel } from "ai";
import * as dotenv from "dotenv";
import { HcsDecisionAuditSink } from "./audit-sink.js";
import { HederaSpendingPolicy } from "./hedera-spending-policy.js";
import { treasuryPolicy } from "./policy-config.js";
import { PaymentHistoryHook } from "./payment-history-hook.js";
import type { PaymentRecord } from "./types.js";

dotenv.config();

const accountId = requiredEnv("ACCOUNT_ID");
const privateKey = requiredEnv("PRIVATE_KEY");
const topicId = requiredEnv("HCS_TOPIC_ID");
const userRequest = process.argv.slice(2).join(" ").trim();

if (!userRequest) {
  throw new Error('Provide a payment request, for example: npm run agent -- "Pay 10 HBAR to 0.0.800800 for cloud-infrastructure"');
}

const client = Client.forTestnet().setOperator(
  accountId,
  PrivateKey.fromString(privateKey),
);
const auditSink = new HcsDecisionAuditSink(client, topicId);
const paymentHistory: PaymentRecord[] = [];
const policy = new HederaSpendingPolicy(treasuryPolicy, paymentHistory, [], () => new Date(), auditSink);
const historyHook = new PaymentHistoryHook(paymentHistory);

const toolkit = new HederaAIToolkit({
  client,
  configuration: {
    plugins: [coreAccountPlugin],
    tools: [],
    context: {
      mode: AgentMode.AUTONOMOUS,
      accountId,
      hooks: [policy, historyHook],
    },
  },
});

const model = wrapLanguageModel({
  model: openai("gpt-4o-mini"),
  middleware: toolkit.middleware(),
});

const response = await generateText({
  model,
  tools: toolkit.getTools(),
  stopWhen: stepCountIs(3),
  system: `You are a payment operations agent on Hedera testnet.
Translate the user's natural-language payment request into the Hedera transfer HBAR tool.
Never invent a recipient, amount, or purpose.
The transactionMemo must be compact JSON in this exact form:
{"policy":{"requestId":"<unique-request-id>","purpose":"<allowed-purpose>"}}
Allowed purposes: ${treasuryPolicy.allowedPurposes.join(", ")}.
If the request does not clearly contain every required field, ask for clarification and do not call a tool.
Deterministic policy hooks have the final authority and may block your tool call.`,
  prompt: userRequest,
});

console.log(response.text);
if (policy.decisions.length > 0) {
  console.log(JSON.stringify({ policyDecisions: policy.decisions }, null, 2));
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required. Use a dedicated Hedera testnet value.`);
  return value;
}
