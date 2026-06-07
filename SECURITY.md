# Security Notes

- Run the agent only with a dedicated Hedera testnet account during evaluation.
- Never commit `.env`, account private keys, or provider API keys.
- Policy and audit failures stop payment execution by default.
- The official Hedera Agent Kit and Hiero SDK dependency chain currently reports upstream npm advisories without an available package-level fix. Review upstream releases before production deployment.
