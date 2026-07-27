# ProofPair architecture, stack and scale plan

This document separates the working prototype from a credible production path. The separation is intentional: architecture ambition is useful only when the evaluator can tell what exists today.

## Working prototype

| Layer | Technology | Why it is here |
|---|---|---|
| Experience | Next.js 16, React 19, TypeScript 5.9 | One responsive analyst workspace with typed client state |
| Design system | Native CSS tokens and accessible HTML controls | AMEX-aligned color system, restrained geometry, printable receipt |
| Decision core | Framework-independent ECMAScript module | Deterministic rules remain testable without rendering the UI |
| Test gate | Node test runner, ESLint, TypeScript, Next production build | Fast, reproducible source and behavior checks |
| Delivery | GitHub Actions, Vercel, Node 22, committed npm lockfile | Same clean install/build contract in CI and hosting |
| Data | Six synthetic fixtures and local text/JSON upload | Safe Round 1 demonstration without implying integration |

The prototype intentionally uses no database, model API, secret, login provider or external service. That keeps the proof reproducible and makes every demonstrated outcome inspectable.

## Production target — logical services

1. **Case API and work orchestration**  
   Owns case lifecycle, assignments, SLA timers and idempotent commands. State changes use optimistic concurrency; duplicate connector events are harmless.
2. **Evidence ingress**  
   Accepts party, merchant, network and third-party records; writes encrypted originals to object storage; creates a signed manifest; emits an `EvidenceReceived` event.
3. **Normalization workers**  
   Extract structured facts asynchronously. OCR or language models may propose fields, but every extracted field retains source coordinates, extractor version and verification state.
4. **Evidence graph**  
   Links claims, records, parties, transaction facts and contradictions. It is a provenance index, not a truth oracle.
5. **Policy runtime**  
   Loads an immutable reason-pack release, validates the evidence contract, computes party ledgers, executes contradiction and sufficiency gates, and returns a deterministic result.
6. **Specialist router**  
   Converts every abstention into a named queue, reason and required next record. It prevents “human review” from becoming an operational dead end.
7. **Decision-receipt service**  
   Stores rationale, evidence identifiers, control results, policy version and operator action in an append-only case ledger.
8. **Communication service**  
   Generates approved templates and sends only after authorization, with channel delivery receipts and deadline tracking.
9. **Governance control plane**  
   Runs regression fixtures and behavioral transformations before maker-checker promotion of a rule release.
10. **Observability and audit export**  
    Measures service health and decision behavior without placing raw evidence or card data in logs.

## Synchronous analyst path

`Analyst → API gateway → Case service → Evidence graph read → Policy runtime → Decision receipt → Analyst`

The response either contains a governed recommendation or a typed abstention. There is no silent fallback to an unconstrained model. Any financial/account action sits behind a separately authorized command and dual control.

## Asynchronous evidence path

`Connector → ingress → encrypted object store → event bus → normalization → verification queue → evidence graph → case recomputation notification`

The event envelope carries `event_id`, `case_id`, `evidence_id`, schema version, source, received time and idempotency key. Consumers record processed IDs. Poison messages move to a dead-letter queue with an operator-visible case task.

## Data and correctness strategy

- **System of record:** relational case store for state and assignments.
- **Original evidence:** encrypted object storage with retention policy and legal-hold support.
- **Provenance:** append-only evidence manifest; mutations create new versions.
- **Search:** derived index for case and evidence retrieval; never authoritative.
- **Caching:** rule-pack and read-model cache only; cache loss cannot change the decision contract.
- **Consistency:** transactional outbox publishes committed case events; consumers are idempotent.
- **Isolation:** tenant/account boundaries are enforced in the gateway and storage keys, not inferred from UI state.
- **Audit:** receipt roots are periodically anchored outside the decision service’s own write path.

## Scale and resilience

ProofPair scales by partitioning on `case_id` while keeping a single case’s ordered events together. Read-heavy queue views use materialized projections; decision evaluation remains stateless against a version-pinned input bundle.

- horizontal workers for OCR, normalization and contradiction extraction
- bounded concurrency per connector to protect downstream systems
- retries with exponential backoff and jitter for transient failures
- circuit breakers for unhealthy connectors
- bulkheads between evidence ingestion, analyst reads and outbound communications
- multi-zone services and replicated durable stores
- replayable events to rebuild search/queue projections
- backpressure and explicit queue-age alerts instead of unbounded memory buffers
- canary policy releases evaluated in shadow mode before promotion

No numerical throughput or latency target is claimed until AMEX workload distributions, document sizes, policy complexity and regional constraints are measured.

## Security and compliance posture

- tokenized transaction references; no PAN in application logs
- encryption in transit and at rest with centrally managed key rotation
- least-privilege service identities and short-lived credentials
- persona and case-scope authorization on every server-side read
- maker-checker policy release and privileged-action approval
- field-level redaction in observability pipelines
- retention/deletion policy by evidence class and jurisdiction
- immutable security/audit events exported to an independent control boundary
- threat-model coverage for malicious uploads, prompt/document injection, evidence substitution, replay, confused deputy and insider policy tampering

The prototype is not a compliance certification. A production release would require AMEX security, legal, risk, privacy, model-risk and operational review.

## Operational scorecard

Production success should be measured as a system of guardrails, not a single automation-rate target:

- median and tail case age by reason code
- first-pass evidence completeness
- unresolved-contradiction rate
- specialist routing precision and queue time
- analyst override rate by policy version
- decision reversals / re-disputes by reason code
- provenance defects and missing receipt fields
- policy regression failures before release
- connector freshness, retry and dead-letter volume
- member/merchant outcome distributions with proxy-risk review

Automation is acceptable only inside measured policy coverage; abstention quality is a first-class product metric.
