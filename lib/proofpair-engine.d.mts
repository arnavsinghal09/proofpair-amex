export type Party = "member" | "merchant" | "neutral";

export interface Evidence {
  id: string;
  label: string;
  type: string;
  source: string;
  supports: Party;
  reliability: number;
  verified: boolean;
  detail: string;
}

export interface DisputeCase {
  id: string;
  code: string;
  merchant: string;
  member: string;
  amount: number;
  currency: string;
  ageDays: number;
  slaHours: number;
  queue: string;
  narrative: string;
  evidence: Evidence[];
}

export interface Evaluation {
  caseId: string;
  code: string;
  outcome: "member_win" | "merchant_win" | "human_escalation";
  memberScore: number;
  merchantScore: number;
  scoreGap: number;
  minScoreGap: number;
  missing: string[];
  contradictions: Array<{
    id: string;
    severity: string;
    label: string;
    status: "resolved_by_policy" | "unresolved";
    requiresReview: boolean;
    resolution: string;
    evidenceIds: string[];
  }>;
  unresolvedContradictions: string[];
  checks: Record<string, boolean>;
  rationale: string;
  decisiveEvidence: string[];
  ruleVersion: string;
}

export const REASON_CODES: Record<string, {
  name: string;
  short: string;
  category: string;
  accent: string;
  required: string[];
  decisive: string[];
  signalWeights: Record<string, number>;
  minScoreGap: number;
  deadlineDays: number;
}>;
export const CASES: DisputeCase[];
export function evaluateCase(inputCase: DisputeCase): Evaluation;
export function detectContradictions(inputCase: DisputeCase): Evaluation["contradictions"];
export function runFairnessSuite(inputCase: DisputeCase): Array<{
  id: string;
  name: string;
  transformation: string;
  expected: string;
  actual: string;
  pass: boolean;
}>;
export function simulateCase(
  inputCase: DisputeCase,
  options?: {
    removeEvidenceId?: string;
    reliabilityDelta?: number;
    party?: "member" | "merchant";
    addContradiction?: boolean;
  },
): Evaluation;
export function operationsMetrics(cases?: DisputeCase[]): {
  total: number;
  resolved: number;
  escalated: number;
  automationRate: number;
  fairnessPassed: number;
  fairnessTotal: number;
  atRisk: number;
};
export function formatOutcome(outcome: string): string;
