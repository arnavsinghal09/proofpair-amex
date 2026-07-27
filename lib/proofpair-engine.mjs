export const REASON_CODES = {
  "4554": {
    name: "Goods / Services Not Received",
    short: "Not received",
    category: "Fulfilment",
    accent: "#2f6fed",
    required: ["transaction_record", "member_statement", "merchant_fulfilment"],
    decisive: ["carrier_delivery", "pickup_confirmation", "service_access_log"],
    signalWeights: {
      member_statement: 0.55,
      merchant_fulfilment: 0.5,
      carrier_delivery: 0.75,
      address_match: 0.85,
      incident_report: 0.7,
      pickup_confirmation: 0.85,
      service_access_log: 0.85,
    },
    minScoreGap: 0.3,
    deadlineDays: 120,
  },
  "4553": {
    name: "Not As Described / Defective",
    short: "Not as described",
    category: "Product quality",
    accent: "#805ad5",
    required: ["transaction_record", "member_statement", "product_description"],
    decisive: ["inspection_report", "dated_photos", "return_correspondence"],
    signalWeights: {
      member_statement: 0.55,
      product_description: 0.75,
      inspection_report: 0.9,
      dated_photos: 0.75,
      return_correspondence: 0.8,
    },
    minScoreGap: 0.3,
    deadlineDays: 120,
  },
  "4544": {
    name: "Cancelled Recurring Goods / Services",
    short: "Cancelled recurring",
    category: "Recurring billing",
    accent: "#db5c3b",
    required: ["transaction_record", "member_statement", "cancellation_record"],
    decisive: ["cancellation_confirmation", "usage_log", "billing_terms"],
    signalWeights: {
      member_statement: 0.55,
      cancellation_record: 0.9,
      cancellation_confirmation: 0.9,
      usage_log: 0.6,
      billing_terms: 0.75,
    },
    minScoreGap: 0.3,
    deadlineDays: 120,
  },
  "4512": {
    name: "Multiple Processing",
    short: "Duplicate charge",
    category: "Processing error",
    accent: "#c58b18",
    required: ["transaction_record", "member_statement", "duplicate_transaction"],
    decisive: ["merchant_batch_record", "separate_receipts", "refund_record"],
    signalWeights: {
      member_statement: 0.55,
      duplicate_transaction: 0.9,
      merchant_batch_record: 0.85,
      separate_receipts: 0.85,
      refund_record: 0.9,
    },
    minScoreGap: 0.3,
    deadlineDays: 120,
  },
  "4513": {
    name: "Credit Not Presented",
    short: "Missing credit",
    category: "Credit processing",
    accent: "#16856b",
    required: ["transaction_record", "member_statement", "credit_record"],
    decisive: ["refund_receipt", "merchant_ledger", "issuer_posting_record"],
    signalWeights: {
      member_statement: 0.55,
      credit_record: 0.8,
      refund_receipt: 0.9,
      merchant_ledger: 0.85,
      issuer_posting_record: 0.95,
      return_record: 0.7,
    },
    minScoreGap: 0.3,
    deadlineDays: 120,
  },
};

export const CASES = [
  {
    id: "DP-20841",
    code: "4554",
    merchant: "Northstar Audio",
    member: "Maya Chen",
    amount: 684.2,
    currency: "USD",
    ageDays: 11,
    slaHours: 7,
    queue: "Priority review",
    narrative:
      "Member reports headphones never arrived. Merchant supplied a carrier scan, but the scan resolves to a different postal code and has no recipient signature.",
    evidence: [
      evidence("e1", "Transaction record", "transaction_record", "network", "neutral", 1, true, "Apr 08 · $684.20 · card ending 9214"),
      evidence("e2", "Member declaration", "member_statement", "member", "member", 0.76, true, "Signed non-receipt declaration"),
      evidence("e3", "Order confirmation", "merchant_fulfilment", "merchant", "merchant", 0.65, true, "Order #NS-7732 · Ship-to ZIP 10013"),
      evidence("e4", "Carrier delivery scan", "carrier_delivery", "carrier", "merchant", 0.25, true, "Delivered Apr 11 · ZIP 10011 · no signature"),
      evidence("e5", "Address match", "address_match", "derived", "member", 0.99, true, "Ship-to and scan ZIP codes do not match"),
    ],
  },
  {
    id: "DP-20837",
    code: "4554",
    merchant: "Atelier Forma",
    member: "Rafael Ortiz",
    amount: 1290,
    currency: "USD",
    ageDays: 18,
    slaHours: 3,
    queue: "Needs analyst",
    narrative:
      "Merchant has signed delivery and address match. Member provides a building incident report that may indicate package theft after delivery.",
    evidence: [
      evidence("e1", "Transaction record", "transaction_record", "network", "neutral", 1, true, "May 02 · $1,290.00"),
      evidence("e2", "Member statement", "member_statement", "member", "member", 0.72, true, "Signed non-receipt statement"),
      evidence("e3", "Fulfilment record", "merchant_fulfilment", "merchant", "merchant", 0.9, true, "Order and address record"),
      evidence("e4", "Signed delivery", "carrier_delivery", "carrier", "merchant", 0.95, true, "Signature and address confirmed"),
      evidence("e5", "Building incident log", "incident_report", "building", "member", 0.64, true, "Reported lobby theft within delivery window"),
    ],
  },
  {
    id: "DP-20819",
    code: "4544",
    merchant: "Solis Fitness",
    member: "Leah Kim",
    amount: 89,
    currency: "USD",
    ageDays: 25,
    slaHours: 19,
    queue: "Ready to resolve",
    narrative:
      "Member cancelled before renewal. Merchant acknowledgement confirms cancellation but billing continued in the next cycle.",
    evidence: [
      evidence("e1", "Transaction record", "transaction_record", "network", "neutral", 1, true, "Jun 01 · $89.00 renewal"),
      evidence("e2", "Member statement", "member_statement", "member", "member", 0.74, true, "Renewal disputed"),
      evidence("e3", "Cancellation email", "cancellation_record", "merchant", "member", 0.96, true, "Cancellation accepted May 22"),
      evidence("e4", "Usage log", "usage_log", "merchant", "merchant", 0.23, true, "No access after May 20"),
    ],
  },
  {
    id: "DP-20792",
    code: "4512",
    merchant: "Mori Hotel",
    member: "Aiden Brooks",
    amount: 418,
    currency: "USD",
    ageDays: 7,
    slaHours: 31,
    queue: "Ready to resolve",
    narrative:
      "Two same-value authorizations posted 43 seconds apart. Merchant batch contains one completed stay and no second receipt.",
    evidence: [
      evidence("e1", "Transaction pair", "transaction_record", "network", "neutral", 1, true, "Two $418 postings · 43 seconds apart"),
      evidence("e2", "Member statement", "member_statement", "member", "member", 0.75, true, "Only one stay purchased"),
      evidence("e3", "Duplicate transaction", "duplicate_transaction", "network", "member", 0.98, true, "Same merchant, amount, token and day"),
      evidence("e4", "Merchant batch", "merchant_batch_record", "merchant", "member", 0.91, true, "One fulfilled folio"),
    ],
  },
  {
    id: "DP-20771",
    code: "4513",
    merchant: "Vela Home",
    member: "Priya Shah",
    amount: 242.5,
    currency: "USD",
    ageDays: 34,
    slaHours: 15,
    queue: "Missing evidence",
    narrative:
      "Member presents a return receipt, but neither party has supplied the promised credit receipt or merchant ledger entry.",
    evidence: [
      evidence("e1", "Transaction record", "transaction_record", "network", "neutral", 1, true, "Mar 18 · $242.50"),
      evidence("e2", "Member statement", "member_statement", "member", "member", 0.71, true, "Credit promised but not posted"),
      evidence("e3", "Return carrier receipt", "return_record", "carrier", "member", 0.84, true, "Return delivered Mar 29"),
    ],
  },
  {
    id: "DP-20745",
    code: "4553",
    merchant: "Aureline",
    member: "Noah Williams",
    amount: 375,
    currency: "USD",
    ageDays: 43,
    slaHours: 1,
    queue: "Escalated",
    narrative:
      "Product appearance differs from member expectation, while merchant listing language is subjective. Critical inspection evidence is absent.",
    evidence: [
      evidence("e1", "Transaction record", "transaction_record", "network", "neutral", 1, true, "Feb 12 · $375.00"),
      evidence("e2", "Member statement", "member_statement", "member", "member", 0.68, true, "Finish materially different"),
      evidence("e3", "Product listing", "product_description", "merchant", "merchant", 0.77, true, "Hand-finished; natural variation"),
      evidence("e4", "Member photographs", "dated_photos", "member", "member", 0.63, true, "Metadata date unavailable"),
    ],
  },
];

function evidence(id, label, type, source, supports, reliability, verified, detail) {
  return { id, label, type, source, supports, reliability, verified, detail };
}

const round = (value) => Math.round(value * 100);

export function evaluateCase(inputCase) {
  const rule = REASON_CODES[inputCase.code];
  if (!rule) throw new Error(`Unsupported reason code: ${inputCase.code}`);

  const verified = inputCase.evidence.filter((item) => item.verified);
  const verifiedTypes = new Set(verified.map((item) => item.type));
  const missing = rule.required.filter((type) => !verifiedTypes.has(type));
  const memberEvidence = verified.filter((item) => item.supports === "member");
  const merchantEvidence = verified.filter((item) => item.supports === "merchant");
  const signalFor = (item) => item.reliability * (rule.signalWeights[item.type] ?? 0.5);
  const memberScore = memberEvidence.reduce((sum, item) => sum + signalFor(item), 0);
  const merchantScore = merchantEvidence.reduce((sum, item) => sum + signalFor(item), 0);
  const contradictions = detectContradictions(inputCase);
  const unresolvedContradictions = contradictions.filter((item) => item.requiresReview);
  const decisivePresent = rule.decisive.some((type) => verifiedTypes.has(type));
  const scoreGap = Math.abs(memberScore - merchantScore);

  let outcome = "human_escalation";
  let rationale = "The available record is too incomplete or balanced for an automated recommendation.";

  if (inputCase.ageDays > rule.deadlineDays) {
    rationale = "The case is outside the configured reason-pack window, so it is routed for policy exception review.";
  } else if (missing.length) {
    rationale = "Required verified evidence is missing, so the case is routed for evidence completion or specialist review.";
  } else if (unresolvedContradictions.length) {
    rationale = "Credible evidence remains in unresolved conflict, so the case is routed to a named specialist.";
  } else if (!decisivePresent) {
    rationale = "No verified decisive record is present, so the system abstains rather than rely on background evidence alone.";
  } else if (scoreGap < rule.minScoreGap) {
    rationale = "The governed signal gap is below the rule-pack threshold, so the system abstains rather than manufacture certainty.";
  } else {
    outcome = memberScore > merchantScore ? "member_win" : "merchant_win";
    rationale =
      outcome === "member_win"
        ? "Verified member-supporting evidence exceeds the merchant record under the version-pinned rule pack."
        : "Verified merchant-supporting evidence exceeds the member record under the version-pinned rule pack.";
  }

  const checks = {
    requiredEvidenceComplete: missing.length === 0,
    deadlineEligible: inputCase.ageDays <= rule.deadlineDays,
    contradictionGatePassed: unresolvedContradictions.length === 0,
    decisiveEvidencePresent: decisivePresent,
    scoreGapPassed: scoreGap >= rule.minScoreGap,
  };

  return {
    caseId: inputCase.id,
    code: inputCase.code,
    outcome,
    memberScore: round(memberScore),
    merchantScore: round(merchantScore),
    scoreGap: round(scoreGap),
    minScoreGap: round(rule.minScoreGap),
    missing,
    contradictions,
    unresolvedContradictions: unresolvedContradictions.map((item) => item.id),
    checks,
    rationale,
    decisiveEvidence: verified
      .filter((item) => rule.decisive.includes(item.type))
      .sort((a, b) => b.reliability - a.reliability)
      .map((item) => item.id),
    ruleVersion: `PP-${inputCase.code}-1.0`,
  };
}

export function detectContradictions(inputCase) {
  const contradictions = [];
  const verified = inputCase.evidence.filter((item) => item.verified);
  const types = new Set(verified.map((item) => item.type));
  const text = verified.map((item) => item.detail.toLowerCase()).join(" ");

  if (types.has("simulated_conflict")) {
    contradictions.push({
      id: "counterfactual-conflict",
      severity: "high",
      label: "Counterfactual record conflicts with the current evidence bundle",
      status: "unresolved",
      requiresReview: true,
      resolution: "The scenario cannot clear until the injected conflict is independently resolved.",
      evidenceIds: verified.filter((item) => item.type === "simulated_conflict").map((item) => item.id),
    });
  }
  if (inputCase.code === "4554" && types.has("carrier_delivery") && text.includes("do not match")) {
    contradictions.push({
      id: "delivery-address",
      severity: "high",
      label: "Delivery scan conflicts with the verified ship-to address",
      status: "resolved_by_policy",
      requiresReview: false,
      resolution: "The verified destination comparison materially weakens the carrier delivery record.",
      evidenceIds: verified
        .filter((item) => ["merchant_fulfilment", "carrier_delivery", "address_match"].includes(item.type))
        .map((item) => item.id),
    });
  }
  if (inputCase.code === "4554" && types.has("carrier_delivery") && types.has("incident_report")) {
    contradictions.push({
      id: "custody-window",
      severity: "medium",
      label: "Delivery confirmation and post-delivery custody report require analyst review",
      status: "unresolved",
      requiresReview: true,
      resolution: "The record cannot determine whether loss occurred before or after completed delivery.",
      evidenceIds: verified
        .filter((item) => ["carrier_delivery", "incident_report"].includes(item.type))
        .map((item) => item.id),
    });
  }
  if (inputCase.code === "4553" && types.has("dated_photos") && text.includes("metadata date unavailable")) {
    contradictions.push({
      id: "photo-provenance",
      severity: "medium",
      label: "Photo timing cannot be verified against fulfilment",
      status: "unresolved",
      requiresReview: true,
      resolution: "A dated inspection record or independently timestamped image is required.",
      evidenceIds: verified.filter((item) => item.type === "dated_photos").map((item) => item.id),
    });
  }
  return contradictions;
}

export function runFairnessSuite(inputCase) {
  const baseline = evaluateCase(inputCase);

  const irrelevantAttribute = evaluateCase({
    ...inputCase,
    member: "Anonymous member",
    demographicProfile: "transformed",
  });

  const strongerMemberEvidence = evaluateCase({
    ...inputCase,
    evidence: inputCase.evidence.map((item) =>
      item.supports === "member"
        ? { ...item, reliability: Math.min(1, item.reliability + 0.08) }
        : item,
    ),
  });

  const strongerMerchantEvidence = evaluateCase({
    ...inputCase,
    evidence: inputCase.evidence.map((item) =>
      item.supports === "merchant"
        ? { ...item, reliability: Math.min(1, item.reliability + 0.08) }
        : item,
    ),
  });

  const incomplete = evaluateCase({
    ...inputCase,
    evidence: inputCase.evidence.filter(
      (item) => !REASON_CODES[inputCase.code].required.includes(item.type),
    ),
  });

  const roleSwapped = evaluateCase({
    ...inputCase,
    member: inputCase.merchant,
    merchant: inputCase.member,
    evidence: inputCase.evidence.map((item) => ({
      ...item,
      source:
        item.source === "member"
          ? "merchant"
          : item.source === "merchant"
            ? "member"
            : item.source,
      supports:
        item.supports === "member"
          ? "merchant"
          : item.supports === "merchant"
            ? "member"
            : item.supports,
    })),
  });

  const expectedSwap =
    baseline.outcome === "member_win"
      ? "merchant_win"
      : baseline.outcome === "merchant_win"
        ? "member_win"
        : "human_escalation";

  return [
    {
      id: "FAIR-01",
      name: "Irrelevant-attribute invariance",
      transformation: "Replace identity and demographic context",
      expected: baseline.outcome,
      actual: irrelevantAttribute.outcome,
      pass: irrelevantAttribute.outcome === baseline.outcome,
    },
    {
      id: "FAIR-02",
      name: "Evidence monotonicity",
      transformation: "Independently strengthen verified evidence for each party",
      expected: `Member ≥ ${baseline.memberScore}; merchant ≥ ${baseline.merchantScore}`,
      actual: `Member ${strongerMemberEvidence.memberScore}; merchant ${strongerMerchantEvidence.merchantScore}`,
      pass:
        strongerMemberEvidence.memberScore >= baseline.memberScore &&
        strongerMemberEvidence.merchantScore === baseline.merchantScore &&
        strongerMerchantEvidence.merchantScore >= baseline.merchantScore &&
        strongerMerchantEvidence.memberScore === baseline.memberScore,
    },
    {
      id: "FAIR-03",
      name: "Missing-evidence abstention",
      transformation: "Remove all required evidence",
      expected: "human_escalation",
      actual: incomplete.outcome,
      pass: incomplete.outcome === "human_escalation",
    },
    {
      id: "FAIR-04",
      name: "Role-swap symmetry",
      transformation: "Swap which party presents identical evidence",
      expected: expectedSwap,
      actual: roleSwapped.outcome,
      pass: roleSwapped.outcome === expectedSwap,
    },
  ];
}

export function simulateCase(inputCase, options = {}) {
  let evidenceSet = inputCase.evidence.map((item) => ({ ...item }));
  if (options.removeEvidenceId) {
    evidenceSet = evidenceSet.filter((item) => item.id !== options.removeEvidenceId);
  }
  if (options.reliabilityDelta) {
    evidenceSet = evidenceSet.map((item) =>
      item.supports === (options.party ?? "member")
        ? { ...item, reliability: Math.max(0, Math.min(1, item.reliability + options.reliabilityDelta)) }
        : item,
    );
  }
  if (options.addContradiction) {
    evidenceSet.push(
      evidence(
        "sim-contradiction",
        "Counterfactual conflicting record",
        "simulated_conflict",
        "counterfactual",
        "neutral",
        0.68,
        true,
        "This injected record intentionally conflicts with the current verified evidence bundle.",
      ),
    );
  }
  return evaluateCase({ ...inputCase, evidence: evidenceSet });
}

export function operationsMetrics(cases = CASES) {
  const results = cases.map(evaluateCase);
  const resolved = results.filter((item) => item.outcome !== "human_escalation").length;
  const escalated = results.length - resolved;
  const fairness = cases.flatMap(runFairnessSuite);
  return {
    total: cases.length,
    resolved,
    escalated,
    automationRate: Math.round((resolved / cases.length) * 100),
    fairnessPassed: fairness.filter((item) => item.pass).length,
    fairnessTotal: fairness.length,
    atRisk: cases.filter((item) => item.slaHours <= 8).length,
  };
}

export function formatOutcome(outcome) {
  return {
    member_win: "Recommend member resolution",
    merchant_win: "Recommend merchant resolution",
    human_escalation: "Escalate to specialist",
  }[outcome] ?? outcome;
}
