# ProofPair verification report

Date: 27 July 2026  
Scope: local release candidate before GitHub/Vercel publication

## Automated gate

| Gate | Result |
|---|---|
| ESLint | Pass |
| Engine and source assertions | 15/15 pass |
| Behavioral transformations | 24/24 pass across six fixtures |
| TypeScript | Pass |
| Next.js production build | Pass |
| Static route generation | Pass (`/`, `/_not-found`) |
| Dependency audit | Pending network-enabled GitHub CI |

The local quality command completed with exit code 0 after the final engine and UI truth corrections.

## Static interaction audit

- Every rendered `<button>` has an action/type.
- Every icon-only button has an accessible name.
- Search, bulk-operation and assurance selectors have accessible labels or enclosing labels.
- Source tests reject prior-hosting marks, unreadable typography tokens and decorative primary workflows.
- The evidence room distinguishes verified, unverified, missing and absent records.
- The weighted ledger displays `verification strength × governed type weight = contribution`.
- Queue status cannot say “Review-ready” when the deadline, required-record, decisive-record, contradiction or score-gap control is blocked.

## Engine audit

- Required completeness uses verified evidence only.
- Unverified records cannot satisfy a required type or add score.
- Reason-pack weights and minimum gaps are configuration, not hidden constants.
- A verified decisive record is required for a recommendation.
- Out-of-window cases route to policy exception review.
- Unresolved contradictions override numerical separation.
- Decision output is a recommendation or specialist route, never a financial action.
- The canonical 4554 fixture produces member 126, merchant 51, gap 75, minimum 30.
- The ambiguous 4554 fixture routes to a specialist despite a 32-point gap because custody remains unresolved.

## Visual audit

The following 3200×1800 assets were rendered and inspected at original resolution:

- product operating map
- four-surface structural wireframes
- end-to-end dispute-resolution swimlane
- four-gate deterministic decision flow
- production-target event and service flow

Final deployed-product screenshots and the screen recording remain release gates; pre-correction screenshots are explicitly excluded.

## Publication gates still requiring external access

1. GitHub authentication must be refreshed before the local release commit can be written/pushed in the current environment.
2. The final URL must be opened in a controllable browser for interaction, desktop/mobile layout, console, screenshot and recording verification.
3. GitHub Actions must complete the network-enabled production dependency audit.
4. Vercel must build the same pushed commit SHA and pass a signed-out smoke test.
