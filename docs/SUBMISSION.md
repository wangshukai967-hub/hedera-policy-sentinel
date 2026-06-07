# Hedera AI Agent Bounty Submission Draft

## Target

- Week 5: Build the Best AI Agent on Hedera
- Theme: Policy-constrained agent payments in HBAR or USDC
- Prize: $1,500 in HBAR
- Deadline: June 21, 2026 at 23:59 UTC

## Project Pitch

Policy Sentinel lets an AI agent understand and propose a payment while deterministic Hedera Agent Kit policies retain final authority over whether funds can move.

Unlike prompt-only guardrails, the policy runs inside the Hedera tool lifecycle before transaction signing and submission. It checks recipient allowlists, business purpose, per-payment limits, daily limits, active hours, and request-bound human approval. Every decision receives a deterministic digest and can be anchored to HCS.

## Demo Flow

1. Run an allowed low-value vendor payment.
2. Show a blocked payment to an unknown recipient.
3. Show a high-value payment blocked pending human approval.
4. Approve the request and show the updated HCS audit timeline.
5. Show the Agent Kit policy implementation and passing tests.

## Required Before Submission

- Publish the repository publicly.
- Run one dedicated Hedera testnet transaction and capture its transaction ID.
- Create an HCS topic and capture one decision audit message.
- Record a short demo video or publish a social media demo.
- Submit one piece of feedback about Hedera Agent Kit or tooling.
