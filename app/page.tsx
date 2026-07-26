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

type Page = "overview" | "cases" | "workbench" | "fairness" | "audit";
type Role = "Analyst" | "Card Member" | "Merchant";

const NAV: Array<{ id: Page; label: string; icon: string }> = [
  { id: "overview", label: "Home", icon: "grid" },
  { id: "cases", label: "All disputes", icon: "inbox" },
  { id: "workbench", label: "Review a dispute", icon: "spark" },
  { id: "fairness", label: "Fairness checks", icon: "scale" },
  { id: "audit", label: "Decision history", icon: "shield" },
];

export default function Home() {
  const [page, setPage] = useState<Page>("overview");
  const [role, setRole] = useState<Role>("Analyst");
  const [caseId, setCaseId] = useState("DP-20841");
  const [toast, setToast] = useState("");
  const [simulated, setSimulated] = useState<Evaluation | null>(null);
  const [uploads, setUploads] = useState<Record<string, Evidence[]>>({});
  const [guided, setGuided] = useState(false);
  const [guideStep, setGuideStep] = useState(1);

  const baseCase = CASES.find((item) => item.id === caseId) ?? CASES[0];
  const selectedCase = useMemo(
    () => ({ ...baseCase, evidence: [...baseCase.evidence, ...(uploads[baseCase.id] ?? [])] }),
    [baseCase, uploads],
  );
  const result = useMemo(() => evaluateCase(selectedCase), [selectedCase]);
  const metrics = useMemo(() => operationsMetrics(), []);

  function navigate(next: Page) {
    setPage(next);
    setToast("");
  }

  function chooseCase(nextId: string) {
    setCaseId(nextId);
    setSimulated(null);
    setPage("workbench");
  }

  function startGuide() {
    setCaseId("DP-20841");
    setSimulated(null);
    setGuideStep(1);
    setGuided(true);
    setPage("workbench");
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
        notify("JSON could not be parsed; imported as a text record");
      }
    }
    const next: Evidence = {
      id: `upload-${Date.now()}`,
      label: parsed.label ?? file.name.replace(/\.[^.]+$/, "").replaceAll(/[-_]/g, " "),
      type: parsed.type ?? "uploaded_record",
      source: parsed.source ?? "uploaded",
      supports: parsed.supports ?? "neutral",
      reliability: typeof parsed.reliability === "number" ? Math.max(0, Math.min(1, parsed.reliability)) : 0.55,
      verified: false,
      detail: parsed.detail ?? (raw.slice(0, 140) || "Locally supplied evidence record"),
    };
    setUploads((current) => ({ ...current, [caseId]: [...(current[caseId] ?? []), next] }));
    notify(`${next.label} normalized into the evidence record`);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
          </div>
          <div>
            <strong>ProofPair</strong>
            <small>Resolution intelligence</small>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Get around</p>
          {NAV.map((item) => (
            <button
              className={page === item.id ? "nav-item active" : "nav-item"}
              key={item.id}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "cases" && <b>6</b>}
            </button>
          ))}
        </nav>

        <div className="sidebar-rule" />
        <p className="nav-label">Reason codes</p>
        <div className="rule-stack">
          {Object.entries(REASON_CODES).map(([code, rule]) => (
            <button key={code} onClick={() => {
              const match = CASES.find((item) => item.code === code);
              if (match) chooseCase(match.id);
            }}>
              <i style={{ background: rule.accent }} />
              <span><strong>{code}</strong>{rule.short}</span>
              <Icon name="chevron" />
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className="pulse" />
            <div><strong>Demo ready</strong><small>Rules PP-v1.0 · Synthetic data</small></div>
          </div>
          <button className="user-card">
            <span className="avatar">AS</span>
            <span><strong>Alex Smith</strong><small>Resolution analyst</small></span>
            <Icon name="dots" />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            <span>American Express</span>
            <Icon name="chevron" />
            <strong>{NAV.find((item) => item.id === page)?.label}</strong>
          </div>
          <div className="top-actions">
            <div className="demo-pill"><Icon name="beaker" /> Safe demo data</div>
            <div className="role-switch">
              <Icon name="user" />
              <span>Viewing as</span>
              <select value={role} onChange={(event) => setRole(event.target.value as Role)} aria-label="Switch persona">
                <option>Analyst</option>
                <option>Card Member</option>
                <option>Merchant</option>
              </select>
            </div>
            <button className="icon-button" aria-label="Notifications"><Icon name="bell" /><i /></button>
          </div>
        </header>

        <div className="page-wrap">
          {page === "overview" && <Overview metrics={metrics} chooseCase={chooseCase} startGuide={startGuide} />}
          {page === "cases" && <CaseQueue chooseCase={chooseCase} />}
          {page === "workbench" && (
            <Workbench
              item={selectedCase}
              result={simulated ?? result}
              original={result}
              role={role}
              onSimulate={setSimulated}
              onNotify={notify}
              chooseCase={chooseCase}
              onAddEvidence={addEvidence}
              guided={guided}
              guideStep={guideStep}
              onGuideStep={setGuideStep}
              onGuideExit={() => setGuided(false)}
            />
          )}
          {page === "fairness" && <FairnessLab item={selectedCase} chooseCase={chooseCase} />}
          {page === "audit" && <AuditControls onNotify={notify} />}
        </div>
      </main>
      {toast && <div className="toast"><Icon name="check" />{toast}</div>}
    </div>
  );
}

function Overview({ metrics, chooseCase, startGuide }: { metrics: ReturnType<typeof operationsMetrics>; chooseCase: (id: string) => void; startGuide: () => void }) {
  return (
    <>
      <PageHeading
        eyebrow="Welcome to ProofPair"
        title="Resolve disputes with less guesswork"
        description="Compare both sides, spot missing evidence, and understand every recommendation before anyone acts."
        actions={<button className="secondary-button" onClick={() => chooseCase("DP-20841")}><Icon name="spark" /> Skip to a case</button>}
      />
      <section className="welcome-panel">
        <div className="welcome-copy">
          <span className="welcome-badge"><Icon name="play" /> 90-second walkthrough</span>
          <h2>Your first dispute, explained step by step.</h2>
          <p>We’ll guide you through one non-delivery case—what each side submitted, what conflicts, and why the recommendation is safe to review.</p>
          <button className="welcome-button" onClick={startGuide}>Start guided review <Icon name="arrow" /></button>
        </div>
        <div className="journey-preview">
          {[
            ["01", "Understand the case", "See the claim in plain language"],
            ["02", "Compare both sides", "Inspect evidence and conflicts"],
            ["03", "Review the outcome", "See the rule trace and next step"],
          ].map((step, index) => (
            <div key={step[0]} className={index === 0 ? "active" : ""}>
              <span>{step[0]}</span>
              <div><strong>{step[1]}</strong><small>{step[2]}</small></div>
              {index < 2 && <i />}
            </div>
          ))}
        </div>
      </section>
      <div className="section-intro"><div><span>Live workspace</span><h2>Today at a glance</h2></div><p>All figures below are synthetic demonstration metrics.</p></div>
      <section className="metric-grid">
        <Metric label="Open disputes" value="148" delta="↓ 12.4%" detail="vs. prior 7 days" tone="blue" />
        <Metric label="Evidence-complete" value="81%" delta="↑ 9.2%" detail="first response" tone="green" />
        <Metric label="Median resolution" value="2.4d" delta="↓ 18h" detail="synthetic target" tone="violet" />
        <Metric label="SLA at risk" value={`${metrics.atRisk}`} delta="Needs action" detail="within 8 hours" tone="amber" />
      </section>
      <section className="overview-grid">
        <div className="card large-card">
          <CardHeader title="Resolution flow" subtitle="Synthetic operations · last 7 days" action="View report" />
          <div className="flow-chart" aria-label="Resolution volume chart">
            {[52, 68, 61, 82, 73, 88, 79, 96, 84, 108, 94, 116].map((height, index) => (
              <div key={index}><span style={{ height: `${height}px` }} /><i style={{ height: `${Math.max(24, height - 22)}px` }} /></div>
            ))}
          </div>
          <div className="chart-legend"><span><i className="legend-blue" /> Evidence complete</span><span><i className="legend-light" /> Needs response</span><b>Apr 01 — Apr 12</b></div>
        </div>
        <div className="card">
          <CardHeader title="Automation boundary" subtitle="Deterministic recommendations" />
          <div className="donut-wrap">
            <div className="donut"><div><strong>{metrics.automationRate}%</strong><span>resolvable</span></div></div>
            <div className="donut-legend">
              <span><i className="dot blue" /><b>{metrics.resolved}</b> Rule-complete</span>
              <span><i className="dot orange" /><b>{metrics.escalated}</b> Human review</span>
            </div>
          </div>
          <div className="boundary-note"><Icon name="shield" /><span><strong>Fail-closed by design</strong>Missing or conflicting evidence never receives an automatic recommendation.</span></div>
        </div>
      </section>
      <section className="card">
        <CardHeader title="Cases requiring attention" subtitle="Prioritized by SLA, value, and evidence risk" action="Open queue" />
        <MiniCaseTable chooseCase={chooseCase} />
      </section>
    </>
  );
}

function CaseQueue({ chooseCase }: { chooseCase: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All cases");
  const visible = CASES.filter((item) =>
    `${item.id} ${item.merchant} ${item.member} ${item.code}`.toLowerCase().includes(query.toLowerCase()) &&
    (filter === "All cases" || item.queue === filter),
  );

  return (
    <>
      <PageHeading
        eyebrow="Cases to review"
        title="All disputes"
        description="Start with the deadline, evidence status, or plain-language reason—then open a case when you’re ready."
        actions={<button className="secondary-button"><Icon name="download" /> Export queue</button>}
      />
      <section className="card queue-card">
        <div className="toolbar">
          <label className="search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search case, merchant, or member" /></label>
          <div className="filter-tabs">
            {["All cases", "Ready to resolve", "Needs analyst", "Missing evidence"].map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={filter === item ? "active" : ""}>{item}</button>
            ))}
          </div>
          <button className="filter-button"><Icon name="sliders" /> Filters</button>
        </div>
        <div className="case-table full">
          <div className="table-row header">
            <span>Case</span><span>Parties</span><span>Reason</span><span>Amount</span><span>Evidence</span><span>SLA</span><span>Status</span><span />
          </div>
          {visible.map((item) => {
            const result = evaluateCase(item);
            const completeness = Math.round((item.evidence.length / Math.max(item.evidence.length, REASON_CODES[item.code].required.length + 1)) * 100);
            return (
              <button className="table-row" key={item.id} onClick={() => chooseCase(item.id)}>
                <span><strong>{item.id}</strong><small>{item.ageDays} days open</small></span>
                <span><strong>{item.merchant}</strong><small>{item.member}</small></span>
                <span><b className="code-chip">{item.code}</b><small>{REASON_CODES[item.code].short}</small></span>
                <span><strong>${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong><small>{item.currency}</small></span>
                <span><strong>{completeness}%</strong><span className="mini-progress"><i style={{ width: `${completeness}%` }} /></span></span>
                <span className={item.slaHours <= 8 ? "urgent" : ""}><strong>{item.slaHours}h</strong><small>remaining</small></span>
                <span><StatusPill outcome={result.outcome} /></span>
                <span><Icon name="arrow" /></span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Workbench({
  item,
  result,
  original,
  role,
  onSimulate,
  onNotify,
  chooseCase,
  onAddEvidence,
  guided,
  guideStep,
  onGuideStep,
  onGuideExit,
}: {
  item: DisputeCase;
  result: Evaluation;
  original: Evaluation;
  role: Role;
  onSimulate: (result: Evaluation | null) => void;
  onNotify: (message: string) => void;
  chooseCase: (id: string) => void;
  onAddEvidence: (file: File) => Promise<void>;
  guided: boolean;
  guideStep: number;
  onGuideStep: (step: number) => void;
  onGuideExit: () => void;
}) {
  const [activeEvidence, setActiveEvidence] = useState(item.evidence[3]?.id ?? item.evidence[0].id);
  const [tab, setTab] = useState("Evidence graph");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const selected = item.evidence.find((evidence) => evidence.id === activeEvidence) ?? item.evidence[0];
  const rule = REASON_CODES[item.code];
  const guideCopy = [
    {
      title: "First, understand what happened",
      copy: "This summary gives you the amount, reason, deadline, and both parties before you inspect any details.",
      action: "Show me the evidence",
    },
    {
      title: "Now compare both sides",
      copy: "Select any evidence card to see where it came from, whom it supports, and how reliable it is in this demo.",
      action: "Explain the rule checks",
    },
    {
      title: "Finally, understand the recommendation",
      copy: "The rule trace shows every gate. Nothing is sent automatically; you can open the receipt or escalate.",
      action: "Open the receipt",
    },
  ][guideStep - 1];

  function advanceGuide() {
    if (guideStep === 1) {
      setActiveEvidence(item.evidence.find((evidence) => evidence.type === "carrier_delivery")?.id ?? item.evidence[0].id);
      onGuideStep(2);
    } else if (guideStep === 2) {
      setTab("Rule trace");
      onGuideStep(3);
    } else {
      setReceiptOpen(true);
      onGuideExit();
    }
  }

  return (
    <>
      {guided && guideCopy && (
        <section className="guide-coach">
          <div className="guide-progress">
            <span>{guideStep}</span>
            <div><small>Guided review</small><strong>Step {guideStep} of 3</strong></div>
          </div>
          <div className="guide-message"><h2>{guideCopy.title}</h2><p>{guideCopy.copy}</p></div>
          <div className="guide-actions"><button onClick={onGuideExit}>Exit guide</button><button onClick={advanceGuide}>{guideCopy.action} <Icon name="arrow" /></button></div>
        </section>
      )}
      <div className="case-heading">
        <div>
          <div className="eyebrow-row"><span>Review a dispute</span><i />{item.id}</div>
          <h1>{item.merchant} <span>vs.</span> {item.member}</h1>
          <p>{item.narrative}</p>
        </div>
        <div className="case-heading-actions">
          <select value={item.id} onChange={(event) => chooseCase(event.target.value)} aria-label="Select demo case">
            {CASES.map((demoCase) => <option value={demoCase.id} key={demoCase.id}>{demoCase.id} · {REASON_CODES[demoCase.code].short}</option>)}
          </select>
          <button className="secondary-button" onClick={() => window.print()}><Icon name="download" /> Receipt</button>
          <button className="primary-button" onClick={() => onNotify("Case routed to specialist review")}><Icon name="send" /> Route decision</button>
        </div>
      </div>

      <div className="case-facts">
        <span><small>Disputed amount</small><strong>${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
        <span><small>Reason code</small><strong><b className="code-chip">{item.code}</b>{rule.name}</strong></span>
        <span><small>Filed</small><strong>{item.ageDays} days ago</strong></span>
        <span><small>SLA remaining</small><strong className={item.slaHours <= 8 ? "danger-text" : ""}>{item.slaHours} hours</strong></span>
        <span><small>Current persona</small><strong>{role}</strong></span>
      </div>

      <div className={`persona-banner ${role.toLowerCase().replace(" ", "-")}`}>
        <span className="persona-icon"><Icon name={role === "Analyst" ? "usercheck" : role === "Merchant" ? "store" : "user"} /></span>
        <div>
          <small>{role} experience</small>
          <strong>{role === "Analyst" ? "Review the complete two-sided record and route a governed recommendation." : role === "Merchant" ? "Respond to the claim, supply fulfilment proof, and track the resolution deadline." : "Follow your dispute, add supporting evidence, and understand the decision or appeal path."}</strong>
        </div>
        <button onClick={() => onNotify(role === "Analyst" ? "Analyst review workspace is active" : role === "Merchant" ? "Merchant response checklist opened" : "Member evidence checklist opened")}>
          {role === "Analyst" ? "Review controls" : role === "Merchant" ? "Prepare response" : "View my checklist"} <Icon name="arrow" />
        </button>
      </div>

      <div className="workspace-grid">
        <section className="card evidence-panel">
          <div className="panel-title">
            <div><span className="step-number">01</span><h2>Evidence record</h2></div>
            <label className="evidence-upload">
              <input type="file" accept=".txt,.json,text/plain,application/json" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onAddEvidence(file);
                event.target.value = "";
              }} />
              <Icon name="plus" /> Add evidence
            </label>
          </div>
          <div className="evidence-completion">
            <div><span><strong>{item.evidence.length}</strong> items normalized</span><b>{result.missing.length ? `${result.missing.length} required missing` : "Required set complete"}</b></div>
            <div className="progress-track"><i style={{ width: result.missing.length ? "68%" : "100%" }} /></div>
          </div>
          <p className="evidence-note"><Icon name="info" /> Reliability scores are transparent demo inputs—not AI certainty.</p>
          <div className="evidence-list">
            {item.evidence.map((evidence) => (
              <button key={evidence.id} onClick={() => setActiveEvidence(evidence.id)} className={activeEvidence === evidence.id ? "active" : ""}>
                <span className={`evidence-icon ${evidence.source}`}><Icon name={evidence.source === "member" ? "user" : evidence.source === "merchant" ? "store" : "file"} /></span>
                <span><strong>{evidence.label}</strong><small>{evidence.detail}</small></span>
                <span className="evidence-meta"><b>{Math.round(evidence.reliability * 100)}%</b><small>{evidence.verified ? "Verified" : "Unverified"}</small></span>
              </button>
            ))}
          </div>
          <div className="evidence-detail">
            <div className="detail-head"><span>Selected evidence</span><b>{selected.id.toUpperCase()}</b></div>
            <h3>{selected.label}</h3><p>{selected.detail}</p>
            <div className="provenance-row">
              <span><small>Source</small><strong>{selected.source}</strong></span>
              <span><small>Supports</small><strong>{selected.supports}</strong></span>
              <span><small>Demo reliability</small><strong>{Math.round(selected.reliability * 100)} / 100</strong></span>
              <span><small>Lineage</small><strong><Icon name="lock" /> Source linked</strong></span>
            </div>
          </div>
        </section>

        <section className="card reasoning-panel">
          <div className="panel-title"><div><span className="step-number">02</span><h2>Why this decision?</h2></div><span className="version-badge">{result.ruleVersion}</span></div>
          <div className="tab-row">
            {["Evidence graph", "Rule trace", "What-if"].map((itemTab) => <button className={tab === itemTab ? "active" : ""} onClick={() => setTab(itemTab)} key={itemTab}>{itemTab}</button>)}
          </div>
          {tab === "Evidence graph" && <EvidenceGraph item={item} result={result} />}
          {tab === "Rule trace" && <RuleTrace item={item} result={result} />}
          {tab === "What-if" && <WhatIf item={item} original={original} result={result} onSimulate={onSimulate} />}
        </section>

        <section className="decision-panel">
          <div className="decision-glow" />
          <div className="decision-top"><span className="step-number dark">03</span><span>Recommended resolution</span><b>Explainable</b></div>
          <div className={`outcome-mark ${result.outcome}`}><Icon name={result.outcome === "human_escalation" ? "usercheck" : "check"} /></div>
          <p className="outcome-kicker">{result.outcome === "human_escalation" ? "Guardrail activated" : "Rule-complete outcome"}</p>
          <h2>{formatOutcome(result.outcome)}</h2>
          <p className="decision-copy">{result.rationale}</p>
          <div className="confidence">
            <div><span>Evidence sufficiency</span><strong>{result.confidence}%</strong></div>
            <div className="confidence-track"><i style={{ width: `${result.confidence}%` }} /></div>
          </div>
          <div className="balance">
            <div><span>Card member</span><b>{result.memberScore}</b></div>
            <div className="balance-line"><i style={{ width: `${Math.max(8, result.memberScore / (result.memberScore + result.merchantScore) * 100)}%` }} /></div>
            <div><span>Merchant</span><b>{result.merchantScore}</b></div>
          </div>
          <div className="decision-reasons">
            {Object.entries(result.checks).map(([label, pass]) => (
              <span key={label}><Icon name={pass ? "check" : "alert"} /><span><strong>{humanize(label)}</strong><small>{pass ? "Satisfied by record" : "Requires attention"}</small></span></span>
            ))}
          </div>
          <button className="decision-button" onClick={() => setReceiptOpen(true)}><Icon name="receipt" /> Generate decision receipt</button>
          <button className="text-button" onClick={() => onNotify("Appeal pathway opened for both parties")}>Review appeal pathway <Icon name="arrow" /></button>
        </section>
      </div>

      <section className="case-timeline">
        <div className="timeline-title"><span>Case history</span><b>Traceable event history</b></div>
        {[
          ["Case opened", "Member initiated a non-receipt dispute", "Apr 19 · 09:14"],
          ["Merchant response", "Order record and carrier scan supplied", "Apr 21 · 16:42"],
          ["Contradiction found", "Delivery ZIP differs from verified destination", "Apr 21 · 16:43"],
          ["Resolution ready", "Rule trace and fairness tests completed", "Today · 10:08"],
        ].map((event, index) => <div className="timeline-event" key={event[0]}><i className={index === 3 ? "live" : ""} /><span><strong>{event[0]}</strong><small>{event[1]}</small></span><time>{event[2]}</time></div>)}
      </section>
      {receiptOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
            <header>
              <div className="receipt-brand"><span className="mini-brand"><i /><i /></span><span><strong>ProofPair</strong><small>Decision receipt</small></span></div>
              <button aria-label="Close receipt" onClick={() => setReceiptOpen(false)}>×</button>
            </header>
            <div className="receipt-case">
              <span><small>Case</small><strong>{item.id}</strong></span>
              <span><small>Rule</small><strong>{result.ruleVersion}</strong></span>
              <span><small>Generated</small><strong>Deterministic demo</strong></span>
            </div>
            <div className="receipt-outcome"><span><Icon name={result.outcome === "human_escalation" ? "usercheck" : "check"} /></span><div><small>Recommended resolution</small><h2 id="receipt-title">{formatOutcome(result.outcome)}</h2><p>{result.rationale}</p></div><strong>{result.confidence}%<small>evidence score</small></strong></div>
            <div className="receipt-columns">
              <div><h3>Decisive evidence</h3>{result.decisiveEvidence.map((id) => {
                const evidence = item.evidence.find((entry) => entry.id === id);
                return <span key={id}><Icon name="check" /><span><strong>{evidence?.label ?? id}</strong><small>{evidence?.detail ?? "Evidence record"}</small></span></span>;
              })}</div>
              <div><h3>Controls applied</h3>{Object.entries(result.checks).map(([key, pass]) => <span key={key}><Icon name={pass ? "check" : "alert"} /><span><strong>{humanize(key)}</strong><small>{pass ? "Satisfied" : "Analyst review required"}</small></span></span>)}</div>
            </div>
            {result.contradictions.length > 0 && <div className="receipt-conflict"><Icon name="alert" /><span><strong>Conflict disclosed</strong>{result.contradictions[0].label}</span></div>}
            <footer><p>Both parties may submit new material evidence or request specialist review. This recommendation does not execute an account action.</p><button className="secondary-button" onClick={() => window.print()}><Icon name="download" /> Print / save PDF</button><button className="primary-button" onClick={() => { setReceiptOpen(false); onNotify("Receipt confirmed in the current demo session"); }}><Icon name="check" /> Confirm receipt</button></footer>
          </section>
        </div>
      )}
    </>
  );
}

function EvidenceGraph({ item, result }: { item: DisputeCase; result: Evaluation }) {
  return (
    <div className="graph-wrap">
      <div className="graph-column">
        <p>Card member record</p>
        {item.evidence.filter((evidence) => evidence.supports === "member").map((evidence) => (
          <div className="graph-node member-node" key={evidence.id}><Icon name="file" /><span><strong>{evidence.label}</strong><small>{Math.round(evidence.reliability * 100)}% reliability</small></span></div>
        ))}
      </div>
      <div className="graph-core">
        <div className="connector-lines"><i /><i /><i /><i /></div>
        <div className="rule-orb"><span>{item.code}</span><small>Rule pack</small></div>
        {result.contradictions.length > 0 && <div className="conflict-tag"><Icon name="alert" /> {result.contradictions.length} conflict detected</div>}
      </div>
      <div className="graph-column">
        <p>Merchant record</p>
        {item.evidence.filter((evidence) => evidence.supports === "merchant").map((evidence) => (
          <div className="graph-node merchant-node" key={evidence.id}><Icon name="file" /><span><strong>{evidence.label}</strong><small>{Math.round(evidence.reliability * 100)}% reliability</small></span></div>
        ))}
        {item.evidence.filter((evidence) => evidence.supports === "neutral").map((evidence) => (
          <div className="graph-node neutral-node" key={evidence.id}><Icon name="network" /><span><strong>{evidence.label}</strong><small>Network fact</small></span></div>
        ))}
      </div>
      <div className="graph-caption"><Icon name="info" /><span>Edges represent rule relevance—not learned correlation. Select <strong>Rule trace</strong> to inspect every gate.</span></div>
    </div>
  );
}

function RuleTrace({ item, result }: { item: DisputeCase; result: Evaluation }) {
  const rule = REASON_CODES[item.code];
  const steps: Array<[string, string, boolean]> = [
    ["Eligibility window", `${item.ageDays} days ≤ ${rule.deadlineDays}-day rule window`, result.checks.deadlineEligible],
    ["Required record", result.missing.length ? `Missing: ${result.missing.join(", ")}` : "All required evidence types present", result.checks.requiredEvidenceComplete],
    ["Contradiction control", result.contradictions.length ? `${result.contradictions.length} conflict routed through guardrail` : "No material contradictions", result.checks.contradictionReviewed],
    ["Evidence balance", `Member ${result.memberScore} · Merchant ${result.merchantScore}`, result.outcome !== "human_escalation"],
  ];
  return <div className="rule-trace">{steps.map((step, index) => <div key={step[0]}><span className={step[2] ? "pass" : "review"}>{step[2] ? <Icon name="check" /> : <Icon name="alert" />}</span><span><small>Gate {index + 1}</small><strong>{step[0]}</strong><p>{step[1]}</p></span><b>{step[2] ? "PASS" : "REVIEW"}</b></div>)}</div>;
}

function WhatIf({ item, original, result, onSimulate }: { item: DisputeCase; original: Evaluation; result: Evaluation; onSimulate: (result: Evaluation | null) => void }) {
  return (
    <div className="what-if">
      <div className="scenario-banner"><Icon name="beaker" /><span><strong>Counterfactual sandbox</strong>Change one fact. ProofPair recomputes the complete rule trace.</span></div>
      <div className="scenario-actions">
        <button onClick={() => onSimulate(simulateCase(item, { removeEvidenceId: item.evidence.find((evidence) => REASON_CODES[item.code].required.includes(evidence.type) && evidence.source !== "network")?.id }))}><Icon name="minus" /><span><strong>Remove required evidence</strong><small>Prove fail-closed abstention</small></span></button>
        <button onClick={() => onSimulate(simulateCase(item, { reliabilityDelta: 0.15, party: "merchant" }))}><Icon name="trend" /><span><strong>Strengthen merchant proof</strong><small>+15 reliability points</small></span></button>
        <button onClick={() => onSimulate(simulateCase(item, { addContradiction: true }))}><Icon name="alert" /><span><strong>Introduce conflict</strong><small>Add mismatched delivery record</small></span></button>
      </div>
      <div className="scenario-result">
        <span><small>Baseline</small><strong>{formatOutcome(original.outcome)}</strong></span>
        <Icon name="arrow" />
        <span><small>Current scenario</small><strong>{formatOutcome(result.outcome)}</strong></span>
        <button onClick={() => onSimulate(null)}>Reset</button>
      </div>
    </div>
  );
}

function FairnessLab({ item, chooseCase }: { item: DisputeCase; chooseCase: (id: string) => void }) {
  const [ran, setRan] = useState(true);
  const suite = runFairnessSuite(item);
  const passed = suite.filter((test) => test.pass).length;
  return (
    <>
      <PageHeading
        eyebrow="Decision assurance"
        title="Fairness checks"
        description="See whether the same evidence is treated consistently when identity, strength, completeness, or party role changes."
        actions={<><select className="heading-select" value={item.id} onChange={(event) => chooseCase(event.target.value)}>{CASES.map((demoCase) => <option value={demoCase.id} key={demoCase.id}>{demoCase.id}</option>)}</select><button className="primary-button" onClick={() => setRan(true)}><Icon name="play" /> Run suite</button></>}
      />
      <section className="fairness-summary">
        <div className="fairness-score">
          <div className="score-ring"><span><strong>{ran ? passed : "—"}</strong><small>/ {suite.length}</small></span></div>
          <div><p>Behavioral checks</p><h2>{ran && passed === suite.length ? "All controls passed" : "Run the assurance suite"}</h2><span>Case {item.id} · {REASON_CODES[item.code].name}</span></div>
        </div>
        <div className="assurance-facts">
          <span><Icon name="lock" /><b>Deterministic</b><small>Same record, same output</small></span>
          <span><Icon name="code" /><b>Versioned</b><small>Rule pack PP-{item.code}-1.0</small></span>
          <span><Icon name="usercheck" /><b>Fail-closed</b><small>Ambiguity reaches a person</small></span>
        </div>
      </section>
      <section className="test-grid">
        {suite.map((test, index) => (
          <article className="test-card" key={test.id}>
            <div className="test-card-top"><span>{test.id}</span><StatusDot pass={ran && test.pass} /></div>
            <Icon name={["mask", "trend", "hand", "swap"][index]} />
            <h3>{test.name}</h3>
            <p>{test.transformation}</p>
            <div className="test-comparison">
              <span><small>Expected</small><strong>{test.expected.replaceAll("_", " ")}</strong></span>
              <Icon name="equal" />
              <span><small>Actual</small><strong>{ran ? test.actual.replaceAll("_", " ") : "Not run"}</strong></span>
            </div>
            <footer><Icon name={test.pass ? "check" : "alert"} />{test.pass ? "Property holds" : "Investigation required"}</footer>
          </article>
        ))}
      </section>
      <section className="card methodology">
        <div><span className="method-icon"><Icon name="scale" /></span><span><h3>What these tests establish</h3><p>Declared behavioral properties hold for this synthetic record and deterministic rule version.</p></span></div>
        <div><span className="method-icon warning"><Icon name="alert" /></span><span><h3>What they do not establish</h3><p>Passing synthetic tests is not proof of population-level fairness. Proxy discrimination and real-world accuracy require monitored production data and independent review.</p></span></div>
      </section>
    </>
  );
}

function AuditControls({ onNotify }: { onNotify: (message: string) => void }) {
  const events = [
    ["EVT-A91F", "Rule pack executed", "Resolution engine", "PP-4554-1.0", "10:08:14"],
    ["EVT-837C", "Fairness suite passed", "Assurance service", "4 / 4 properties", "10:08:15"],
    ["EVT-2D4A", "Evidence graph snapshotted", "Evidence service", "5 source-linked nodes", "10:08:16"],
    ["EVT-11BE", "Receipt generated", "Alex Smith", "DP-20841", "10:09:02"],
  ];
  return (
    <>
      <PageHeading eyebrow="Review and governance" title="Decision history" description="Retrace what changed, which checks ran, and where human authority remains in control." actions={<button className="secondary-button" onClick={() => onNotify("Audit export scope previewed; persistent export is a future integration")}><Icon name="download" /> Preview export scope</button>} />
      <section className="control-grid">
        <div className="card control-card">
          <span className="control-icon green"><Icon name="shield" /></span><div><p>System posture</p><h3>Protected</h3><small>Core controls active</small></div><StatusPill outcome="member_win" label="Healthy" />
        </div>
        <div className="card control-card">
          <span className="control-icon blue"><Icon name="fingerprint" /></span><div><p>Evidence lineage</p><h3>25 / 25</h3><small>Synthetic records source-tagged</small></div><StatusPill outcome="member_win" label="Traceable" />
        </div>
        <div className="card control-card">
          <span className="control-icon violet"><Icon name="code" /></span><div><p>Active policy</p><h3>PP Rules v1.0</h3><small>Five approved reason packs</small></div><StatusPill outcome="merchant_win" label="Versioned" />
        </div>
      </section>
      <section className="audit-layout">
        <div className="card">
          <CardHeader title="Traceable event stream" subtitle="Case DP-20841 · chronological demo order" action="Inspect record" />
          <div className="audit-list">
            {events.map((event, index) => <div key={event[0]}><span className="audit-line"><i className={index === events.length - 1 ? "last" : ""} /></span><span className="audit-action"><strong>{event[1]}</strong><small>{event[2]}</small></span><code>{event[0]}</code><span><strong>{event[3]}</strong><small>Payload summary</small></span><time>{event[4]}</time></div>)}
          </div>
        </div>
        <div className="card guardrail-card">
          <CardHeader title="Decision controls" subtitle="Policy-enforced boundaries" />
          {[
            ["Missing evidence abstention", "Enabled", true],
            ["Contradiction escalation", "Enabled", true],
            ["Analyst override reason", "Required", true],
            ["Unconstrained LLM decisions", "Blocked", true],
            ["Auto-send external actions", "Blocked", true],
          ].map((control) => <div className="control-row" key={control[0] as string}><span><strong>{control[0]}</strong><small>Runtime policy</small></span><b>{control[1]}</b><i className={control[2] ? "on" : ""}><span /></i></div>)}
          <div className="guardrail-note"><Icon name="info" /><p><strong>Human authority is preserved.</strong>ProofPair recommends and explains. Only authorized AMEX operators execute final account actions.</p></div>
        </div>
      </section>
      <section className="card architecture">
        <CardHeader title="Implemented architecture" subtitle="Truth-labeled components · no hidden decision model" />
        <div className="architecture-flow">
          {[
            ["intake", "Evidence intake", "Text + structured records", "IMPLEMENTED"],
            ["network", "Evidence graph", "Provenance + conflicts", "IMPLEMENTED"],
            ["code", "Rule packs", "5 non-fraud codes", "IMPLEMENTED"],
            ["spark", "Resolution orchestrator", "Deterministic gates", "IMPLEMENTED"],
            ["scale", "Fairness lab", "4 metamorphic tests", "IMPLEMENTED"],
            ["receipt", "Receipt + audit", "In-session demo record", "IMPLEMENTED"],
          ].map((node, index) => <div key={node[1]}><span><Icon name={node[0]} /></span><strong>{node[1]}</strong><small>{node[2]}</small><b>{node[3]}</b>{index < 5 && <i><Icon name="arrow" /></i>}</div>)}
        </div>
      </section>
    </>
  );
}

function MiniCaseTable({ chooseCase }: { chooseCase: (id: string) => void }) {
  return <div className="mini-table">{CASES.slice(0, 4).map((item) => <button key={item.id} onClick={() => chooseCase(item.id)}><span><b className="code-chip">{item.code}</b><span><strong>{item.id}</strong><small>{item.merchant} · {item.member}</small></span></span><span><strong>${item.amount.toLocaleString()}</strong><small>{item.evidence.length} evidence items</small></span><span className={item.slaHours <= 8 ? "urgent" : ""}><strong>{item.slaHours}h</strong><small>SLA left</small></span><StatusPill outcome={evaluateCase(item).outcome} /><Icon name="arrow" /></button>)}</div>;
}

function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}

function Metric({ label, value, delta, detail, tone }: { label: string; value: string; delta: string; detail: string; tone: string }) {
  return <div className={`metric-card ${tone}`}><div><span>{label}</span><Icon name={tone === "amber" ? "alert" : "trend"} /></div><strong>{value}</strong><footer><b>{delta}</b><span>{detail}</span></footer></div>;
}

function CardHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) {
  return <div className="card-header"><div><h3>{title}</h3><p>{subtitle}</p></div>{action && <button>{action}<Icon name="arrow" /></button>}</div>;
}

function StatusPill({ outcome, label }: { outcome: string; label?: string }) {
  return <span className={`status-pill ${outcome}`}><i />{label ?? formatOutcome(outcome)}</span>;
}

function StatusDot({ pass }: { pass: boolean }) {
  return <span className={pass ? "test-status pass" : "test-status"}><i />{pass ? "PASSED" : "READY"}</span>;
}

function humanize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    inbox: <><path d="M4 4h16v14H4z"/><path d="M4 14h5l2 3h2l2-3h5"/></>,
    spark: <><path d="m12 3 1.3 4.7L18 9l-4.7 1.3L12 15l-1.3-4.7L6 9l4.7-1.3L12 3Z"/><path d="m19 15 .6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15Z"/></>,
    scale: <><path d="M12 3v18M5 6h14M5 6l-3 7h6L5 6ZM19 6l-3 7h6l-3-7Z"/><path d="M8 21h8"/></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
    dots: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    beaker: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    trend: <><path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/></>,
    download: <><path d="M12 3v12m0 0 5-5m-5 5-5-5"/><path d="M4 19h16"/></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></>,
    store: <><path d="M4 9v11h16V9M3 9l2-5h14l2 5"/><path d="M8 13h3v7"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    send: <><path d="m3 3 18 9-18 9 4-9-4-9Z"/><path d="M7 12h14"/></>,
    network: <><circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="m11 7-5 9m7-9 5 9M7 18h10"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    alert: <><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5M12 18h.01"/></>,
    minus: <path d="M5 12h14"/>,
    usercheck: <><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0m1-8 2 2 4-4"/></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></>,
    play: <path d="m8 5 11 7-11 7V5Z"/>,
    code: <><path d="m8 9-4 3 4 3m8-6 4 3-4 3M14 5l-4 14"/></>,
    mask: <><path d="M3 11c3-3 6-4 9-4s6 1 9 4c-1 6-4 9-9 9s-8-3-9-9Z"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/></>,
    hand: <><path d="M7 11V6a2 2 0 0 1 4 0v4-6a2 2 0 0 1 4 0v6-4a2 2 0 0 1 4 0v8c0 5-3 7-7 7-3 0-5-1-7-4l-2-3a2 2 0 0 1 3-2l1 1"/></>,
    swap: <><path d="M7 7h12l-3-3m3 3-3 3M17 17H5l3 3m-3-3 3-3"/></>,
    equal: <><path d="M5 9h14M5 15h14"/></>,
    fingerprint: <><path d="M5 12a7 7 0 0 1 14 0M8 12a4 4 0 0 1 8 0c0 5-1 8-3 10M4 16c.5 4 2 6 4 7m3-11c0 5-1 7-2 9M19 16c0 2-.3 4-1 6"/></>,
    intake: <><path d="M4 4h16v5H4zM4 15h16v5H4z"/><path d="M12 9v6"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] ?? paths.file}</svg>;
}
