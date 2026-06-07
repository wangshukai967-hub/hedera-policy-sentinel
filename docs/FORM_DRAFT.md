# Hedera AI Agent Bounty Form Draft

## Project Name

Policy Sentinel

## GitHub Repository

https://github.com/wangshukai967-hub/hedera-policy-sentinel

## Demo URL

https://wangshukai967-hub.github.io/hedera-policy-sentinel/

## One-Line Description

An AI payment agent whose Hedera transactions are governed by deterministic, non-bypassable spending policies and HCS-anchored audit decisions.

## What It Does

Policy Sentinel lets an AI agent translate natural-language payment requests into Hedera Agent Kit tool calls while deterministic policies retain final authority over whether funds can move.

Before transaction signing and submission, the policy validates recipient allowlists, approved business purposes, per-payment limits, cumulative daily limits, active-hour windows, and request-bound human approvals. Every allow or block decision receives a deterministic SHA-256 digest and can be anchored to Hedera Consensus Service.

## Why It Is Useful

Prompt instructions alone are not reliable financial controls. Policy Sentinel separates AI intent interpretation from payment authorization, allowing organizations to use autonomous agents without giving an LLM unrestricted control of treasury funds.

## Hedera Agent Kit Usage

- `HederaSpendingPolicy` extends Agent Kit's `AbstractPolicy`.
- Policy enforcement runs after parameter normalization and before transaction execution.
- `PaymentHistoryHook` records completed transfers for cumulative daily-limit enforcement.
- `HcsDecisionAuditSink` writes policy decisions to Hedera Consensus Service.
- The optional AI entry point uses `HederaAIToolkit` to expose Hedera tools to the model.

## Technical Highlights

- Fails closed when a policy or HCS audit write fails.
- Prevents split-transfer bypasses by evaluating cumulative amounts within a single tool call.
- Uses request-bound, expiring human approval grants for high-value payments.
- Supports overnight active-hour windows.
- Includes an interactive public demo, 16 automated tests, and a production build workflow.

## Agent Kit Feedback

Pending publication: request stable, public normalized-parameter types and typed extraction helpers for core Hedera tools so custom policy authors do not need broad parameter shapes or repository-internal knowledge.

## Testnet Evidence

- Hedera transaction ID: pending dedicated testnet execution
- HCS topic ID: pending dedicated testnet execution
- HCS decision message: pending dedicated testnet execution

## Wallet Address

Pending user-provided Hedera wallet address.
