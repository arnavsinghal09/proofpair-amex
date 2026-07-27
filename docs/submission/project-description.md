# ProofPair — submission copy

## Recommended full description

ProofPair is a governed dispute-resolution workspace for American Express analysts handling evidence-heavy card-member and merchant claims. It turns a fragmented case file into a two-sided, source-linked evidence record; evaluates that record against a version-pinned reason-code pack; surfaces unresolved contradictions; and produces either a reviewable recommendation or a named specialist route. It is deliberately not an unconstrained chatbot and does not execute account actions.

The Round 1 prototype demonstrates five non-fraud reason-code packs—4512, 4513, 4544, 4553, and 4554—across six fictional disputes. The end-to-end workflow includes an operations command center, configurable dispute queue, case workspace, evidence room, decision studio, controlled communications, portfolio intelligence, governance registry, audit trail, exports, and printable decision receipts.

The central design choice is fail-closed decisioning. Only verified evidence can satisfy a required record. Every configured signal has an inspectable policy weight. A recommendation must clear four controls: required evidence is present, contradictions are resolved, the score separation exceeds the reason pack’s minimum gap, and the output retains its evidence and rule-version trace. If any control fails, ProofPair abstains and routes the case to a specialist without moving money or changing an account.

For the worked 4554 “goods or services not received” case, the merchant supplies a carrier scan, but the scan resolves to the wrong postal code and has no recipient signature. ProofPair links the transaction, member declaration, merchant fulfilment record, carrier scan, and address comparison; marks the address contradiction as resolved by the configured policy; and produces a member recommendation with a 75-point evidence gap against a 30-point minimum. A second 4554 case contains credible signed delivery and a post-delivery theft report; the contradiction remains unresolved, so the same engine fails closed to specialist review.

ProofPair also runs four behavioral checks on every fixture: irrelevant-attribute invariance, two-party evidence monotonicity, missing-evidence abstention, and role-swap symmetry. The current deterministic suite passes 24/24 transformations across six cases, while 15 repository tests, linting, type checks, and a production build pass in CI. These checks establish testable behavior on synthetic fixtures; they do not claim real-world accuracy, legal sufficiency, or absence of proxy discrimination.

The prototype uses synthetic data and local browser-session state. It has no American Express, merchant, carrier, payment-rail, or account integration. A production implementation would place the same decision contract behind authenticated services, immutable policy releases, signed evidence manifests, event-driven connectors, durable case storage, maker-checker approvals, and external audit anchoring.

ProofPair’s value is not “AI decides disputes.” Its value is making evidence completeness, policy execution, ambiguity, escalation, and rationale legible in one operating surface—so straightforward cases can move faster while difficult cases reach the right human with the record already organized.

Live prototype: https://proofpair-amex.vercel.app/

## Compact form version

ProofPair is a governed dispute-resolution workspace that converts card-member and merchant submissions into a two-sided, source-linked evidence record. A deterministic, version-pinned reason-code engine checks verified evidence completeness, resolves or surfaces contradictions, applies inspectable signal weights, and produces either a reviewable recommendation with a decision receipt or a named specialist route. The prototype covers five non-fraud reason-code packs and six fictional cases, including two materially different 4554 outcomes. It includes a command center, dispute queue, case workspace, evidence room, decision studio, communications, portfolio intelligence, governance, audit exports, and printable receipts. Four behavioral properties run across every fixture—attribute invariance, two-party evidence monotonicity, missing-evidence abstention, and role-swap symmetry—with 24/24 checks passing; 15 deterministic/source tests, linting, type checks, and production build also pass. The prototype uses synthetic data, performs no account action, and makes no claim of real-world accuracy or legal sufficiency. Production would add authenticated integrations, immutable policy releases, durable event-driven storage, maker-checker approval, and external audit anchoring.

## One-line pitch

ProofPair turns two-sided dispute evidence into a governed recommendation—or an explicit specialist route—without hiding missing records, unresolved contradictions, or the rule trace.
