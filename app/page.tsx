"use client";

import { useMemo, useState } from "react";
import {
  CASES,
  REASON_CODES,
  evaluateCase,
  formatOutcome,
  operationsMetrics,
  runFairnessSuite,
  simulateCase,
  type DisputeCase,
  type Evidence,
  type Evaluation,
} from "../lib/proofpair-engine.mjs";

type Page = "queue" | "review" | "assurance";
type QueueFilter = "All" | "Due soon" | "Ready" | "Needs specialist";

const HERO_CASE_ID = "DP-20841";

export default function Home() {
  const [page, setPage] = useState<Page>("queue");
  const [caseId, setCaseId] = useState(HERO_CASE_ID);
  const [uploads, setUploads] = useState<Record<string, Evidence[]>>({});
  const [toast, setToast] = useState("");

  const baseCase = CASES.find((item) => item.id === caseId) ?? CASES[0];
  const selectedCase = useMemo(
    () => ({ ...baseCase, evidence: [...baseCase.evidence, ...(uploads[baseCase.id] ?? [])] }),
    [baseCase, uploads],
  );

  function openCase(nextId: string) {
    setCaseId(nextId);
    setPage("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function addEvidence(file: File) {
    const raw = await file.text();
    let parsed: Partial<Evidence> = {};

    if (file.name.toLowerCase().endsWith(".json")) {
      try {
        parsed = JSON.parse(raw) as Partial<Evidence>;
      } catch {
        notify("Imported as text because the JSON could not be parsed");
      }
    }

    const evidence: Evidence = {
      id: `upload-${Date.now()}`,
      label: parsed.label ?? file.name.replace(/\.[^.]+$/, "").replaceAll(/[-_]/g, " "),
      type: parsed.type ?? "uploaded_record",
      source: parsed.source ?? "uploaded",
      supports: parsed.supports ?? "neutral",
      reliability: typeof parsed.reliability === "number"
        ? Math.max(0, Math.min(1, parsed.reliability))
        : 0.55,
      verified: false,
      detail: parsed.detail ?? raw.slice(0, 180) ?? "Locally supplied evidence",
    };

    setUploads((current) => ({
      ...current,
      [caseId]: [...(current[caseId] ?? []), evidence],
    }));
    notify(`${evidence.label} added as unverified evidence`);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand-button" onClick={() => setPage("queue")} aria-label="Open dispute queue">
          <BrandMark />
          <span><strong>ProofPair</strong><small>Dispute review</small></span>
        </button>

        <nav aria-label="Primary navigation">
          <button
            className={page !== "assurance" ? "active" : ""}
            onClick={() => setPage("queue")}
            aria-current={page !== "assurance" ? "page" : undefined}
          >
            Disputes
          </button>
          <button
            className={page === "assurance" ? "active" : ""}
            onClick={() => setPage("assurance")}
            aria-current={page === "assurance" ? "page" : undefined}
          >
            Assurance
          </button>
        </nav>

        <div className="header-context">
          <span className="sandbox-label"><Icon name="beaker" /> Synthetic sandbox</span>
          <span className="analyst-chip"><i>AS</i><span><strong>Alex Smith</strong><small>Dispute analyst</small></span></span>
        </div>
      </header>

      <main className="app-main">
        {page === "queue" && <DisputeQueue openCase={openCase} />}
        {page === "review" && (
          <CaseReview
            item={selectedCase}
            onBack={() => setPage("queue")}
            onChoose={openCase}
            onAddEvidence={addEvidence}
            notify={notify}
          />
        )}
        {page === "assurance" && <Assurance item={selectedCase} onChoose={setCaseId} />}
      </main>

      {toast && <div className="toast" role="status"><Icon name="check" /> {toast}</div>}
    </div>
  );
}

function DisputeQueue({ openCase }: { openCase: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QueueFilter>("All");
  const metrics = operationsMetrics();

  const rows = CASES.filter((item) => {
    const evaluation = evaluateCase(item);
    const matchesQuery = `${item.id} ${item.merchant} ${item.member} ${item.code}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesFilter =
      filter === "All" ||
      (filter === "Due soon" && item.slaHours <= 8) ||
      (filter === "Ready" && evaluation.outcome !== "human_escalation") ||
      (filter === "Needs specialist" && evaluation.outcome === "human_escalation");
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="page">
      <header className="page-title">
        <div>
          <span>Demo dispute queue</span>
          <h1>Cases needing a decision</h1>
          <p>Review the closest deadline first. Open a case to compare both parties’ evidence and choose the safe next step.</p>
        </div>
        <button className="primary-action" onClick={() => openCase(HERO_CASE_ID)}>
          Review sample case <Icon name="arrow" />
        </button>
      </header>

      <section className="queue-summary" aria-label="Queue summary">
        <div><strong>{metrics.total}</strong><span>Sample disputes</span></div>
        <div><strong>{CASES.filter((item) => item.slaHours <= 8).length}</strong><span>Due within 8 hours</span></div>
        <div><strong>{metrics.escalated}</strong><span>Need specialist review</span></div>
        <p><Icon name="info" /> All data is fictional and exists only to demonstrate the workflow.</p>
      </section>

      <section className="queue-panel">
        <div className="queue-tools">
          <label className="search-field">
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by case, person, merchant, or reason code"
            />
          </label>
          <div className="filter-group" aria-label="Filter disputes">
            {(["All", "Due soon", "Ready", "Needs specialist"] as QueueFilter[]).map((name) => (
              <button
                className={filter === name ? "active" : ""}
                onClick={() => setFilter(name)}
                aria-pressed={filter === name}
                key={name}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="queue-table">
          <div className="queue-row queue-head">
            <span>Case and issue</span>
            <span>Parties</span>
            <span>Amount</span>
            <span>Evidence</span>
            <span>Deadline</span>
            <span>Next step</span>
            <span />
          </div>
          {rows.map((item) => {
            const evaluation = evaluateCase(item);
            const missing = evaluation.missing.length;
            return (
              <button className={`queue-row ${item.id === HERO_CASE_ID ? "featured" : ""}`} onClick={() => openCase(item.id)} key={item.id}>
                <span className="case-cell" data-label="Case">
                  <span>
                    <strong>{item.id}</strong>
                    {item.id === HERO_CASE_ID && <b>Start here</b>}
                  </span>
                  <small>{REASON_CODES[item.code].short} · Code {item.code}</small>
                </span>
                <span data-label="Merchant / member"><strong>{item.merchant}</strong><small>{item.member}</small></span>
                <span data-label="Amount"><strong>${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong><small>{item.currency}</small></span>
                <span data-label="Evidence"><EvidenceState missing={missing} /></span>
                <span data-label="Deadline" className={item.slaHours <= 8 ? "deadline urgent" : "deadline"}><strong>{item.slaHours}h</strong><small>remaining</small></span>
                <span data-label="Next step"><OutcomeState outcome={evaluation.outcome} /></span>
                <span className="row-arrow"><Icon name="arrow" /></span>
              </button>
            );
          })}
          {rows.length === 0 && <p className="empty-state">No disputes match this search.</p>}
        </div>
      </section>
    </div>
  );
}

function CaseReview({
  item,
  onBack,
  onChoose,
  onAddEvidence,
  notify,
}: {
  item: DisputeCase;
  onBack: () => void;
  onChoose: (id: string) => void;
  onAddEvidence: (file: File) => Promise<void>;
  notify: (message: string) => void;
}) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [simulation, setSimulation] = useState<Evaluation | null>(null);
  const result = simulation ?? evaluateCase(item);
  const rule = REASON_CODES[item.code];
  const memberEvidence = item.evidence.filter((evidence) => evidence.supports === "member");
  const merchantEvidence = item.evidence.filter((evidence) => evidence.supports === "merchant");
  const neutralEvidence = item.evidence.filter((evidence) => evidence.supports === "neutral");

  return (
    <div className="page review-page">
      <button className="back-button" onClick={onBack}><Icon name="arrowleft" /> Back to disputes</button>

      <header className="case-title">
        <div>
          <span>{item.id} · Code {item.code}</span>
          <h1>{rule.short}</h1>
          <p>{item.merchant} and {item.member}</p>
        </div>
        <div className="case-title-actions">
          <select
            value={item.id}
            onChange={(event) => {
              setSimulation(null);
              setReceiptOpen(false);
              onChoose(event.target.value);
            }}
            aria-label="Choose sample case"
          >
            {CASES.map((entry) => <option value={entry.id} key={entry.id}>{entry.id} · {REASON_CODES[entry.code].short}</option>)}
          </select>
        </div>
      </header>

      <section className="case-summary">
        <div><small>Disputed amount</small><strong>${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
        <div><small>Card member</small><strong>{item.member}</strong></div>
        <div><small>Merchant</small><strong>{item.merchant}</strong></div>
        <div><small>Filed</small><strong>{item.ageDays} days ago</strong></div>
        <div className={item.slaHours <= 8 ? "summary-deadline urgent" : "summary-deadline"}><small>Review deadline</small><strong>{item.slaHours} hours</strong></div>
      </section>

      <div className="review-layout">
        <div className="review-content">
          <section className="content-section case-story">
            <div className="section-heading">
              <span>1</span>
              <div><h2>What happened</h2><p>The dispute in plain language.</p></div>
            </div>
            <p className="case-narrative">{item.narrative}</p>
            {result.contradictions.length > 0 && (
              <div className="key-conflict">
                <Icon name="alert" />
                <span><small>Decisive conflict</small><strong>{result.contradictions[0].label}</strong><p>This conflict must be resolved or explicitly escalated before the evidence can support a final account action.</p></span>
              </div>
            )}
          </section>

          <section className="content-section evidence-section">
            <div className="section-heading with-action">
              <span>2</span>
              <div><h2>Evidence from both parties</h2><p>Compare the records, their sources, and any missing proof without relying on an opaque score.</p></div>
              <label className="upload-action">
                <input
                  type="file"
                  accept=".txt,.json,text/plain,application/json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setSimulation(null);
                      void onAddEvidence(file);
                    }
                    event.target.value = "";
                  }}
                />
                <Icon name="plus" /> Add evidence
              </label>
            </div>

            {neutralEvidence.length > 0 && (
              <div className="shared-record">
                <small>Shared transaction record</small>
                {neutralEvidence.map((evidence) => (
                  <EvidenceRow evidence={evidence} compact key={evidence.id} />
                ))}
              </div>
            )}

            <div className="party-columns">
              <div className="party-column">
                <header><PartyAvatar type="member" label={item.member} /><span><small>Card member</small><strong>{item.member}</strong></span></header>
                {memberEvidence.map((evidence) => <EvidenceRow evidence={evidence} key={evidence.id} />)}
                {memberEvidence.length === 0 && <p className="missing-party">No member evidence supplied.</p>}
              </div>
              <div className="party-column merchant">
                <header><PartyAvatar type="merchant" label={item.merchant} /><span><small>Merchant</small><strong>{item.merchant}</strong></span></header>
                {merchantEvidence.map((evidence) => <EvidenceRow evidence={evidence} key={evidence.id} />)}
                {merchantEvidence.length === 0 && <p className="missing-party">No merchant evidence supplied.</p>}
              </div>
            </div>
          </section>

          <section className="content-section decision-details">
            <div className="section-heading">
              <span>3</span>
              <div><h2>How the recommendation was reached</h2><p>Open details only when you need to challenge the result.</p></div>
            </div>

            <details>
              <summary><span><Icon name="checklist" /> Decision rules</span><b>View {Object.keys(result.checks).length} checks</b></summary>
              <div className="details-content">
                {Object.entries(result.checks).map(([name, pass]) => (
                  <div className="check-row" key={name}>
                    <Icon name={pass ? "check" : "alert"} />
                    <span><strong>{humanize(name)}</strong><small>{pass ? "Satisfied by the current record" : "Needs specialist attention"}</small></span>
                    <b className={pass ? "pass" : "warn"}>{pass ? "Passed" : "Review"}</b>
                  </div>
                ))}
                <p className="rule-version">Rule version {result.ruleVersion}. Prototype rules are simplified and not complete AMEX policy.</p>
              </div>
            </details>

            <details>
              <summary><span><Icon name="swap" /> Test an alternative</span><b>What-if analysis</b></summary>
              <div className="details-content scenario-options">
                <button onClick={() => setSimulation(simulateCase(item, { removeEvidenceId: item.evidence[1]?.id }))}>
                  Remove a required record
                </button>
                <button onClick={() => setSimulation(simulateCase(item, { party: "merchant", reliabilityDelta: 0.15 }))}>
                  Strengthen merchant evidence
                </button>
                <button onClick={() => setSimulation(simulateCase(item, { addContradiction: true }))}>
                  Add a conflicting record
                </button>
                {simulation && (
                  <div className="scenario-result">
                    <span><small>Baseline</small><strong>{formatOutcome(evaluateCase(item).outcome)}</strong></span>
                    <Icon name="arrow" />
                    <span><small>Alternative</small><strong>{formatOutcome(simulation.outcome)}</strong></span>
                    <button onClick={() => setSimulation(null)}>Reset</button>
                  </div>
                )}
              </div>
            </details>
          </section>

          <CaseHistory item={item} result={result} />
        </div>

        <aside className="recommendation-card">
          <div className="recommendation-status">
            <OutcomeState outcome={result.outcome} />
            <span>{result.missing.length ? "Evidence incomplete" : "Review-ready record"}</span>
          </div>
          <small>Recommended next step</small>
          <h2>{formatOutcome(result.outcome)}</h2>
          <p>{result.rationale}</p>

          <div className="recommendation-reason">
            <small>Why</small>
            <strong>
              {result.missing.length
                ? `${result.missing.length} required record${result.missing.length > 1 ? "s are" : " is"} missing.`
                : result.contradictions[0]?.label ?? "The stronger verified record satisfies the configured rule."}
            </strong>
          </div>

          <div className="record-checks">
            <RecordCheck label="Required evidence" pass={result.checks.requiredEvidenceComplete} />
            <RecordCheck label="Filing deadline" pass={result.checks.deadlineEligible} />
            <RecordCheck label="Conflict reviewed" pass={result.checks.contradictionReviewed} />
          </div>

          <button className="primary-action wide" onClick={() => setReceiptOpen(true)}>
            Review decision receipt <Icon name="arrow" />
          </button>
          <button className="secondary-action wide" onClick={() => notify("Case routed to specialist review")}>
            Send to specialist
          </button>
          <p className="authority-note"><Icon name="shield" /> ProofPair recommends and explains. It cannot move money or update an account.</p>
        </aside>
      </div>

      {receiptOpen && <DecisionReceipt item={item} result={result} onClose={() => setReceiptOpen(false)} />}
    </div>
  );
}

function Assurance({ item, onChoose }: { item: DisputeCase; onChoose: (id: string) => void }) {
  const suite = runFairnessSuite(item);
  const passed = suite.filter((test) => test.pass).length;

  return (
    <div className="page assurance-page">
      <header className="page-title">
        <div>
          <span>Behavioral assurance</span>
          <h1>How ProofPair stays accountable</h1>
          <p>These checks challenge one deterministic rule path. They do not prove real-world accuracy or eliminate bias.</p>
        </div>
        <select className="case-select" value={item.id} onChange={(event) => onChoose(event.target.value)}>
          {CASES.map((entry) => <option value={entry.id} key={entry.id}>{entry.id}</option>)}
        </select>
      </header>

      <section className="assurance-summary">
        <div><strong>{passed} of {suite.length}</strong><span>Behavioral checks passed for {item.id}</span></div>
        <p><Icon name="alert" /> Synthetic checks are guardrails, not evidence of population-level fairness.</p>
      </section>

      <section className="assurance-list">
        {suite.map((test) => (
          <article key={test.id}>
            <span className={test.pass ? "assurance-icon pass" : "assurance-icon warn"}><Icon name={test.pass ? "check" : "alert"} /></span>
            <div><small>{test.id}</small><h2>{test.name}</h2><p>{test.transformation}</p></div>
            <div className="expected-actual"><span><small>Expected</small><strong>{test.expected.replaceAll("_", " ")}</strong></span><Icon name="arrow" /><span><small>Actual</small><strong>{test.actual.replaceAll("_", " ")}</strong></span></div>
            <b className={test.pass ? "result-pass" : "result-warn"}>{test.pass ? "Passed" : "Review"}</b>
          </article>
        ))}
      </section>

      <section className="assurance-boundaries">
        <div><Icon name="check" /><span><h2>What this establishes</h2><p>The declared transformation behaves as expected for this synthetic case and rule version.</p></span></div>
        <div><Icon name="alert" /><span><h2>What remains open</h2><p>Real-world accuracy, proxy discrimination, policy exceptions, monitoring, and independent review.</p></span></div>
      </section>

      <details className="technical-details">
        <summary><span><Icon name="code" /> Technical implementation</span><b>Show architecture and event history</b></summary>
        <div className="technical-grid">
          {[
            ["Evidence intake", "Local text and structured records"],
            ["Evidence record", "Provenance and configured conflicts"],
            ["Rule evaluation", "Five versioned synthetic rule packs"],
            ["Assurance", "Four deterministic property checks"],
            ["Receipt", "Reviewable in-session explanation"],
            ["External actions", "Not implemented"],
          ].map(([name, detail]) => <span key={name}><strong>{name}</strong><small>{detail}</small></span>)}
        </div>
      </details>
    </div>
  );
}

function EvidenceRow({ evidence, compact = false }: { evidence: Evidence; compact?: boolean }) {
  return (
    <article className={compact ? "evidence-row compact" : "evidence-row"}>
      <span className="evidence-file"><Icon name="file" /></span>
      <span><strong>{evidence.label}</strong><p>{evidence.detail}</p><small>Source: {humanize(evidence.source)}</small></span>
      <b className={evidence.verified ? "verified" : "submitted"}>{evidence.verified ? "Verified" : "Submitted"}</b>
    </article>
  );
}

function RecordCheck({ label, pass }: { label: string; pass: boolean }) {
  return <span><Icon name={pass ? "check" : "alert"} /><strong>{label}</strong><b className={pass ? "pass" : "warn"}>{pass ? "Passed" : "Review"}</b></span>;
}

function EvidenceState({ missing }: { missing: number }) {
  return <span className={missing ? "evidence-state missing" : "evidence-state complete"}><Icon name={missing ? "alert" : "check"} /> {missing ? `${missing} missing` : "Complete"}</span>;
}

function OutcomeState({ outcome }: { outcome: string }) {
  const human = outcome === "human_escalation";
  return <span className={human ? "outcome-state specialist" : "outcome-state ready"}><i /> {human ? "Specialist" : "Recommendation ready"}</span>;
}

function PartyAvatar({ type, label }: { type: "member" | "merchant"; label: string }) {
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return <span className={`party-avatar ${type}`}>{initials}</span>;
}

function CaseHistory({ item, result }: { item: DisputeCase; result: Evaluation }) {
  const conflict = result.contradictions[0];
  const events = [
    ["Case opened", `${item.member} filed a ${REASON_CODES[item.code].short.toLowerCase()} dispute`, `${item.ageDays} days ago`],
    ["Records received", `${item.evidence.length} records supplied across both parties`, `${Math.max(item.ageDays - 2, 1)} days ago`],
    [
      conflict ? "Conflict detected" : "Evidence normalized",
      conflict?.label ?? "Sources and provenance prepared for comparison",
      "Today · 10:06",
    ],
    ["Review ready", `${formatOutcome(result.outcome)} recommended under ${result.ruleVersion}`, "Today · 10:08"],
  ];
  return (
    <details className="content-section history-section">
      <summary><span><Icon name="history" /> Case history</span><b>4 events</b></summary>
      <div className="history-list">
        {events.map(([name, detail, time]) => <div key={name}><i /><span><strong>{name}</strong><small>{detail}</small></span><time>{time}</time></div>)}
      </div>
    </details>
  );
}

function DecisionReceipt({ item, result, onClose }: { item: DisputeCase; result: Evaluation; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="receipt" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
        <header>
          <span><BrandMark /><span><strong>Decision receipt</strong><small>{item.id} · {result.ruleVersion}</small></span></span>
          <button onClick={onClose} aria-label="Close receipt">×</button>
        </header>
        <div className="receipt-body">
          <OutcomeState outcome={result.outcome} />
          <small>Recommended next step</small>
          <h1 id="receipt-title">{formatOutcome(result.outcome)}</h1>
          <p>{result.rationale}</p>

          <div className="receipt-facts">
            <span><small>Amount</small><strong>${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
            <span><small>Card member</small><strong>{item.member}</strong></span>
            <span><small>Merchant</small><strong>{item.merchant}</strong></span>
          </div>

          <h2>Controls applied</h2>
          <div className="receipt-checks">
            {Object.entries(result.checks).map(([name, pass]) => (
              <RecordCheck label={humanize(name)} pass={pass} key={name} />
            ))}
          </div>

          {result.contradictions.length > 0 && <div className="receipt-conflict"><Icon name="alert" /><span><strong>Conflict disclosed</strong><p>{result.contradictions[0].label}</p></span></div>}
        </div>
        <footer>
          <p>This prototype recommendation does not execute an account action. Either party may supply material evidence or request specialist review.</p>
          <button className="secondary-action" onClick={() => window.print()}>Print or save PDF</button>
          <button className="primary-action" onClick={onClose}>Close receipt</button>
        </footer>
      </section>
    </div>
  );
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><i /><i /></span>;
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    arrowleft: <path d="M19 12H5m5-5-5 5 5 5" />,
    alert: <><path d="M12 3 2 21h20L12 3Z" /><path d="M12 9v5M12 18h.01" /></>,
    beaker: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M7.5 15h9" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    checklist: <><path d="m4 7 2 2 3-3M4 13l2 2 3-3M12 8h8M12 14h8M4 20h16" /></>,
    code: <><path d="m8 9-4 3 4 3m8-6 4 3-4 3M14 5l-4 14" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
    history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    swap: <><path d="M7 7h12l-3-3m3 3-3 3M17 17H5l3 3m-3-3 3-3" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] ?? paths.file}</svg>;
}
