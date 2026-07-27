import assert from "node:assert/strict";
import test from "node:test";
import {
  CASES,
  REASON_CODES,
  evaluateCase,
  operationsMetrics,
  runFairnessSuite,
  simulateCase,
} from "../lib/proofpair-engine.mjs";

test("ships five reason-code packs and six representative cases", () => {
  assert.deepEqual(Object.keys(REASON_CODES).sort(), ["4512", "4513", "4544", "4553", "4554"]);
  assert.equal(CASES.length, 6);
  assert.deepEqual(new Set(CASES.map((item) => item.code)), new Set(["4512", "4513", "4544", "4553", "4554"]));
});

test("canonical 4554 case resolves for the member from the evidence gap", () => {
  const result = evaluateCase(CASES[0]);
  assert.equal(result.outcome, "member_win");
  assert.ok(result.memberScore > result.merchantScore);
  assert.ok(result.scoreGap >= result.minScoreGap);
  assert.equal(result.missing.length, 0);
  assert.equal(result.contradictions.length, 1);
  assert.equal(result.contradictions[0].status, "resolved_by_policy");
  assert.equal(result.unresolvedContradictions.length, 0);
  assert.deepEqual(result.decisiveEvidence, ["e4"]);
});

test("ambiguous 4554 case fails closed to a specialist", () => {
  const result = evaluateCase(CASES[1]);
  assert.equal(result.outcome, "human_escalation");
  assert.ok(result.contradictions.length > 0);
  assert.ok(result.unresolvedContradictions.length > 0);
});

test("missing required evidence always abstains", () => {
  for (const item of CASES) {
    const stripped = {
      ...item,
      evidence: item.evidence.filter((evidence) => !REASON_CODES[item.code].required.includes(evidence.type)),
    };
    assert.equal(evaluateCase(stripped).outcome, "human_escalation");
  }
});

test("unverified evidence never satisfies a required record", () => {
  const source = CASES[0];
  const withUnverifiedFulfilment = {
    ...source,
    evidence: source.evidence.map((item) =>
      item.type === "merchant_fulfilment" ? { ...item, verified: false } : item,
    ),
  };
  const result = evaluateCase(withUnverifiedFulfilment);
  assert.equal(result.outcome, "human_escalation");
  assert.ok(result.missing.includes("merchant_fulfilment"));
});

test("background evidence without a verified decisive record always abstains", () => {
  const source = CASES[0];
  const withoutDecisiveRecords = {
    ...source,
    evidence: source.evidence.filter(
      (item) => !REASON_CODES[source.code].decisive.includes(item.type),
    ),
  };
  const result = evaluateCase(withoutDecisiveRecords);
  assert.equal(result.outcome, "human_escalation");
  assert.equal(result.checks.decisiveEvidencePresent, false);
});

test("cases outside the configured reason-pack window route to exception review", () => {
  const source = CASES[0];
  const result = evaluateCase({
    ...source,
    ageDays: REASON_CODES[source.code].deadlineDays + 1,
  });
  assert.equal(result.outcome, "human_escalation");
  assert.equal(result.checks.deadlineEligible, false);
});

test("governed signal weights and thresholds live inside every reason pack", () => {
  for (const rule of Object.values(REASON_CODES)) {
    assert.ok(rule.minScoreGap > 0);
    assert.ok(Object.keys(rule.signalWeights).length > 0);
  }
});

test("all four metamorphic properties pass across all six cases", () => {
  for (const item of CASES) {
    const suite = runFairnessSuite(item);
    assert.equal(suite.length, 4);
    assert.ok(suite.every((check) => check.pass), `${item.id} has a failing fairness property`);
  }
});

test("counterfactual simulator does not mutate the source case", () => {
  const source = structuredClone(CASES[0]);
  const simulated = simulateCase(CASES[0], { removeEvidenceId: "e4" });
  const conflicted = simulateCase(CASES[0], { addContradiction: true });
  assert.deepEqual(CASES[0], source);
  assert.equal(simulated.caseId, CASES[0].id);
  assert.equal(conflicted.outcome, "human_escalation");
  assert.equal(conflicted.checks.contradictionGatePassed, false);
  assert.equal(conflicted.memberScore, evaluateCase(CASES[0]).memberScore);
  assert.equal(conflicted.merchantScore, evaluateCase(CASES[0]).merchantScore);
});

test("operations metrics reconcile to evaluated cases", () => {
  const metrics = operationsMetrics();
  assert.equal(metrics.total, CASES.length);
  assert.equal(metrics.resolved + metrics.escalated, metrics.total);
  assert.equal(metrics.fairnessPassed, 24);
  assert.equal(metrics.fairnessTotal, 24);
});
