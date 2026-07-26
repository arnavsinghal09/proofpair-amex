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
  assert.ok(result.confidence >= 76);
  assert.equal(result.missing.length, 0);
  assert.equal(result.contradictions.length, 1);
});

test("ambiguous 4554 case fails closed to a specialist", () => {
  const result = evaluateCase(CASES[1]);
  assert.equal(result.outcome, "human_escalation");
  assert.ok(result.contradictions.length > 0);
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
  assert.deepEqual(CASES[0], source);
  assert.equal(simulated.caseId, CASES[0].id);
});

test("operations metrics reconcile to evaluated cases", () => {
  const metrics = operationsMetrics();
  assert.equal(metrics.total, CASES.length);
  assert.equal(metrics.resolved + metrics.escalated, metrics.total);
  assert.equal(metrics.fairnessPassed, 24);
  assert.equal(metrics.fairnessTotal, 24);
});
