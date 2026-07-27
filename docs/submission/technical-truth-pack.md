# ProofPair technical truth pack

Use this document as the single source of truth for the deck, form copy, demo captions, and evaluator Q&A.

## Product contract

ProofPair is a deterministic decision-support prototype. It organizes synthetic evidence, applies versioned rule packs, runs explicit behavioral checks, and returns either a recommendation or a specialist route. It does not authenticate users, connect to American Express systems, send communications, move money, change accounts, or train an adjudication model.

## Implemented now

| Capability | Status | Evidence in product |
|---|---|---|
| Command center | Implemented | SLA exposure, workload, path health, recent activity |
| Dispute queue | Implemented | Search, saved views, filters, configurable columns, selection and bulk actions |
| Case workspace | Implemented | Narrative, transaction facts, party positions, chronology, tasks |
| Evidence room | Implemented | Requirement coverage, provenance, verification state, contradictions, local upload |
| Decision studio | Implemented | Rule trace, party signal ledger, scenario simulation, recommendation or escalation |
| Communications | Implemented locally | Editable evidence requests and an in-session outbound queue; nothing is sent |
| Portfolio intelligence | Implemented on fixtures | Synthetic patterns, workload and outcome views |
| Governance registry | Implemented | Five reason packs, version and authority surfaces, 24 behavioral checks |
| Audit and exports | Implemented locally | In-session events, queue/policy/audit exports, printable receipt |
| Persistence | Not implemented | State ends with the browser session |
| Authentication and authorization | Not implemented | Personas are demonstrative, not access controls |
| OCR / document extraction | Not implemented | Local text/JSON normalization only |
| External connectors | Mocked | No AMEX, merchant, carrier, account or payment-rail connection |
| External audit anchor | Not implemented | Receipt is inspectable, not independently notarized |
| Direct financial action | Prohibited | Output is a recommendation, never money movement |

## Deterministic decision contract

Each reason pack declares required evidence types, decisive evidence types, per-signal weights, a minimum score gap, and a response deadline. The runtime follows this sequence:

1. Accept only evidence marked verified for completeness and scoring.
2. Fail closed if any required verified type is missing.
3. Detect configured contradictions and classify each as resolved by policy or unresolved.
4. Fail closed if an unresolved contradiction remains.
5. Compute each party’s signal ledger from `verification strength × governed type weight`.
6. Require at least one decisive verified evidence type before a recommendation.
7. Fail closed if the absolute score gap is below the pack threshold.
8. Return the recommendation, rationale, checks, rule version context, and evidence-linked contradiction record.

This is a transparent prioritization and decision-support mechanism, not a calibrated probability of correctness.

## Worked case — DP-20841 / reason code 4554

**Question:** Were goods received at the verified destination?

| Evidence | Source | Supports | Verification strength | Governed type weight | Contribution |
|---|---|---:|---:|---:|---:|
| Transaction record | Network | Neutral | 1.00 | N/A | Completeness only |
| Signed non-receipt declaration | Member | Member | 0.76 | 0.55 | 41.8 |
| Merchant fulfilment record | Merchant | Merchant | 0.65 | 0.50 | 32.5 |
| Carrier delivery scan | Carrier | Merchant | 0.25 | 0.75 | 18.75 |
| Verified address comparison | Derived from source records | Member | 0.99 | 0.85 | 84.15 |

Runtime rounds party totals for display:

- Member ledger: **126**
- Merchant ledger: **51**
- Score gap: **75**
- Minimum governed gap: **30**
- Required verified records: **complete**
- Contradiction: carrier scan ZIP 10011 vs verified ship-to ZIP 10013
- Contradiction status: **resolved by policy** because the destination comparison materially weakens the carrier record
- Output: **recommend member position**
- Authority boundary: **recommendation only; no account action**

## Contrast case — DP-20837 / reason code 4554

The merchant supplies a verified signed delivery at the correct address. The member supplies a credible building incident report indicating possible theft after delivery. The member ledger is 84, merchant ledger 116, and gap 32, which exceeds the 30-point threshold—but the custody-window contradiction remains unresolved. ProofPair therefore routes the case to a specialist. Passing the numerical gap can never override an unresolved contradiction.

## Six-case output matrix

| Case | Code | Member | Merchant | Gap / minimum | Governing condition | Output |
|---|---:|---:|---:|---:|---|---|
| DP-20841 | 4554 | 126 | 51 | 75 / 30 | Address conflict resolved by policy | Member recommendation |
| DP-20837 | 4554 | 84 | 116 | 32 / 30 | Unresolved custody conflict | Specialist route |
| DP-20819 | 4544 | 127 | 14 | 113 / 30 | Required record complete | Member recommendation |
| DP-20792 | 4512 | 207 | 0 | 207 / 30 | Duplicate supported by network/batch records | Member recommendation |
| DP-20771 | 4513 | 98 | 0 | 98 / 30 | Required credit record missing | Specialist route |
| DP-20745 | 4553 | 85 | 58 | 27 / 30 | Unresolved provenance; gap below threshold | Specialist route |

## Behavioral assurance suite

These are metamorphic checks on deterministic fixtures—not demographic fairness certification.

| Check | Transformation | Required property |
|---|---|---|
| Irrelevant-attribute invariance | Replace identity and demographic context | Outcome must not change |
| Two-party evidence monotonicity | Independently strengthen verified evidence for each party | That party’s signal cannot decrease; opposing signal cannot change |
| Missing-evidence abstention | Remove every required evidence type | Output must be specialist route |
| Role-swap symmetry | Swap member/merchant identities, sources and supports while holding evidence constant | Non-escalation outcome must swap parties; escalation remains escalation |

Result: **24/24 checks pass** across six fixtures.

Residual risk: direct attribute invariance does not detect proxy discrimination through correlated operational features. Synthetic fixtures do not establish production accuracy, coverage, legal sufficiency, or calibration.

## Verification record

The repository quality gate runs:

- ESLint
- 15 Node test assertions covering reason-pack shape, outcomes, fail-closed behavior, verification semantics, evidence sufficiency, reason-pack windows, metamorphic checks, simulator immutability, operational reconciliation, source integrity, and claim hygiene
- TypeScript validation
- Next.js production build

Latest local result: **all passed**.

## Production target

The production blueprint keeps the decision contract but changes the operating substrate:

- authenticated API gateway and persona-scoped access
- encrypted object storage plus signed evidence manifests
- append-only case/event ledger
- reason-pack registry with immutable releases and maker-checker promotion
- asynchronous evidence normalization and contradiction workers
- durable workflow orchestration with idempotency keys, retries and dead-letter queues
- analyst work queue for every abstention or exception
- observability for latency, drift, queue health, override rate and policy-version outcomes
- externally anchored receipt roots for tamper evidence beyond the governance service’s own write boundary

No throughput, latency, accuracy or savings claim is asserted without a measured production workload.
