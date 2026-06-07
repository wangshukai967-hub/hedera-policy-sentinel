# Hedera Agent Kit Feedback Draft

The v4 hook and policy lifecycle is a strong foundation for constrained AI payments because custom policies can block transactions before signing and submission.

One developer-experience improvement would be to export stable, public normalized-parameter types for each core tool from the package entry points. Custom policy authors currently need to use broad parameter shapes or inspect repository internals to safely interpret normalized transfers. A documented typed helper for extracting recipients, amounts, memos, and transaction outcomes would make production-grade policies easier to build and maintain.
