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
      <header className="product-header">
        <button className="brand product-brand" onClick={() => navigate("overview")} aria-label="Go to ProofPair home">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
          </div>
          <div>
            <strong>ProofPair</strong>
            <small>Resolution intelligence</small>
          </div>
        </button>
        <nav className="product-nav" aria-label="Primary navigation">
          {NAV.map((item) => (
            <button
              className={page === item.id ? "product-nav-item active" : "product-nav-item"}
              key={item.id}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="product-actions">
          <span className="demo-pill"><Icon name="beaker" /> Synthetic demo</span>
          <div className="role-switch">
            <Icon name="user" />
            <span>Viewing as</span>
            <select value={role} onChange={(event) => setRole(event.target.value as Role)} aria-label="Switch persona">
              <option>Analyst</option>
              <option>Card Member</option>
              <option>Merchant</option>
            </select>
          </div>
        </div>
      </header>

      <main className="product-main">
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
    <div className="product-home">
      <section className="home-hero">
        <div className="welcome-copy">
          <span className="welcome-badge"><Icon name="shield" /> Human-reviewed resolution</span>
          <h1>See both sides.<br />Resolve with confidence.</h1>
          <p>ProofPair turns scattered dispute evidence into one clear story—then shows exactly why a case can be resolved or needs a specialist.</p>
          <div className="hero-actions">
            <button className="welcome-button" onClick={startGuide}>Review a sample case <Icon name="arrow" /></button>
            <button className="hero-secondary" onClick={() => chooseCase("DP-20841")}>Open analyst workspace</button>
          </div>
          <div className="hero-proof">
            <span><Icon name="check" /> No black-box decision</span>
            <span><Icon name="check" /> Both parties represented</span>
            <span><Icon name="check" /> Ambiguity escalates</span>
          </div>
        </div>
        <div className="hero-case-card">
          <div className="hero-case-top">
            <span className="case-icon"><Icon name="package" /></span>
            <span><small>Sample dispute · 4554</small><strong>Package marked delivered,<br />card member never received it</strong></span>
          </div>
          <div className="hero-case-parties">
            <span><small>Card member</small><strong>Maya Chen</strong></span>
            <i>vs.</i>
            <span><small>Merchant</small><strong>Northstar Audio</strong></span>
          </div>
          <div className="hero-conflict">
            <Icon name="alert" />
            <span><small>Key conflict detected</small><strong>Delivery ZIP does not match the verified destination</strong></span>
          </div>
          <footer>
            <span><small>Disputed amount</small><strong>$684.20</strong></span>
            <span><small>Time to review</small><strong>≈ 90 seconds</strong></span>
          </footer>
        </div>
      </section>

      <section className="home-value-section">
        <div className="home-section-heading">
          <span>How it works</span>
          <h2>From scattered evidence to a review-ready answer</h2>
          <p>Three understandable steps. Technical detail is available when you need it—not before.</p>
        </div>
        <div className="home-value-grid">
          {[
            ["01", "Bring the story together", "Member, merchant, carrier, and transaction records appear in one shared timeline.", "inbox"],
            ["02", "Make conflicts obvious", "ProofPair surfaces missing records and contradictions instead of burying them in documents.", "spark"],
            ["03", "Recommend or escalate", "A versioned rule trace explains the next step. Unclear cases always go to a person.", "usercheck"],
          ].map(([number, title, copy, icon]) => (
            <article key={number}>
              <span className="value-icon"><Icon name={icon} /></span>
              <small>{number}</small>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-trust-strip">
        <div><strong>{metrics.resolved + metrics.escalated}</strong><span>Synthetic cases available</span></div>
        <div><strong>4</strong><span>Behavioral fairness checks</span></div>
        <div><strong>100%</strong><span>Missing evidence escalated</span></div>
        <button onClick={() => chooseCase("DP-20841")}>Explore the full workspace <Icon name="arrow" /></button>
      </section>
    </div>
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

  if (guided) {
    return (
      <GuidedReview
        item={item}
        result={result}
        step={guideStep}
        onStep={onGuideStep}
        onExit={onGuideExit}
        onFinish={() => {
          setTab("Rule trace");
          setReceiptOpen(true);
          onGuideExit();
        }}
      />
    );
  }

  return (
    <>
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

function GuidedReview({
  item,
  result,
  step,
  onStep,
  onExit,
  onFinish,
}: {
  item: DisputeCase;
  result: Evaluation;
  step: number;
  onStep: (step: number) => void;
  onExit: () => void;
  onFinish: () => void;
}) {
  const rule = REASON_CODES[item.code];
  const memberEvidence = item.evidence.filter((evidence) => evidence.supports === "member");
  const merchantEvidence = item.evidence.filter((evidence) => evidence.supports === "merchant");

  return (
    <div className="guided-shell">
      <header className="guided-header">
        <button onClick={onExit}><Icon name="arrowleft" /> Exit walkthrough</button>
        <div className="guided-progress" aria-label={`Step ${step} of 3`}>
          {["Understand", "Compare", "Decide"].map((label, index) => (
            <span className={index + 1 <= step ? "active" : ""} key={label}>
              <i>{index + 1}</i><b>{label}</b>
            </span>
          ))}
        </div>
        <small>About 90 seconds</small>
      </header>

      {step === 1 && (
        <section className="guided-stage guided-understand">
          <div className="guided-intro">
            <span>Step 1 · Understand the dispute</span>
            <h1>What happened?</h1>
            <p>Start with the story—not the system. Here is the complete dispute in plain language.</p>
          </div>
          <div className="story-card">
            <div className="story-heading">
              <span className="case-icon"><Icon name="package" /></span>
              <div><small>{item.id} · Reason {item.code}</small><h2>{rule.short}</h2></div>
              <StatusPill outcome={result.outcome} label="Ready for review" />
            </div>
            <p className="story-narrative">{item.narrative}</p>
            <div className="story-parties">
              <div><span className="party-avatar member">MC</span><span><small>Card member</small><strong>{item.member}</strong><p>Says the package never arrived.</p></span></div>
              <i>versus</i>
              <div><span className="party-avatar merchant">NA</span><span><small>Merchant</small><strong>{item.merchant}</strong><p>Says the carrier marked it delivered.</p></span></div>
            </div>
            <div className="story-facts">
              <span><small>Amount</small><strong>${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
              <span><small>Filed</small><strong>{item.ageDays} days ago</strong></span>
              <span><small>Review deadline</small><strong>{item.slaHours} hours</strong></span>
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="guided-stage guided-compare">
          <div className="guided-intro">
            <span>Step 2 · Compare the evidence</span>
            <h1>What does each side show?</h1>
            <p>ProofPair keeps the parties separate, makes provenance visible, and brings the decisive conflict to the center.</p>
          </div>
          <div className="evidence-compare">
            <div className="party-evidence member">
              <header><span className="party-avatar member">MC</span><span><small>Card member evidence</small><strong>{item.member}</strong></span></header>
              {memberEvidence.map((evidence) => (
                <article key={evidence.id}>
                  <Icon name="file" />
                  <span><strong>{evidence.label}</strong><small>{evidence.detail}</small></span>
                  <b>{evidence.verified ? "Verified" : "Submitted"}</b>
                </article>
              ))}
            </div>
            <div className="evidence-conflict-card">
              <span><Icon name="alert" /></span>
              <small>Decisive conflict</small>
              <h2>10011 ≠ 10013</h2>
              <p>The carrier delivery ZIP differs from the verified destination, and no recipient signature is present.</p>
              <b>Needs explanation</b>
            </div>
            <div className="party-evidence merchant">
              <header><span className="party-avatar merchant">NA</span><span><small>Merchant evidence</small><strong>{item.merchant}</strong></span></header>
              {merchantEvidence.map((evidence) => (
                <article key={evidence.id}>
                  <Icon name="file" />
                  <span><strong>{evidence.label}</strong><small>{evidence.detail}</small></span>
                  <b>{evidence.verified ? "Verified" : "Submitted"}</b>
                </article>
              ))}
            </div>
          </div>
          <p className="guided-caveat"><Icon name="info" /> Demo reliability values are transparent inputs—not AI certainty or real-world verification.</p>
        </section>
      )}

      {step === 3 && (
        <section className="guided-stage guided-decide">
          <div className="guided-intro">
            <span>Step 3 · Review the recommendation</span>
            <h1>A recommendation you can inspect</h1>
            <p>The engine applies the configured evidence rules, explains every control, and stops when the record is incomplete.</p>
          </div>
          <div className="guided-outcome">
            <div className="outcome-summary">
              <span className={`outcome-mark ${result.outcome}`}><Icon name={result.outcome === "human_escalation" ? "usercheck" : "check"} /></span>
              <small>Recommended next step</small>
              <h2>{formatOutcome(result.outcome)}</h2>
              <p>{result.rationale}</p>
              <div className="guided-score"><span>Evidence sufficiency</span><strong>{result.confidence}%</strong><i><b style={{ width: `${result.confidence}%` }} /></i></div>
            </div>
            <div className="outcome-explanation">
              <h3>Why this recommendation?</h3>
              {[
                ["Required evidence is present", result.checks.requiredEvidenceComplete],
                ["The filing window is valid", result.checks.deadlineEligible],
                ["A decisive address conflict was found", result.contradictions.length > 0],
                ["Decisive evidence supports the result", result.checks.decisiveEvidencePresent],
              ].map(([label, pass]) => (
                <span key={String(label)} className={pass ? "pass" : "warn"}><Icon name={pass ? "check" : "alert"} /><b>{label}</b></span>
              ))}
              <div className="human-control"><Icon name="shield" /><span><strong>A person stays in control</strong><small>This recommendation cannot move money or update an account.</small></span></div>
            </div>
          </div>
        </section>
      )}

      <footer className="guided-footer">
        <span>{step === 1 ? "Next: compare the evidence" : step === 2 ? "Next: understand the recommendation" : "You’ve completed the guided review"}</span>
        <div>
          {step > 1 && <button className="secondary-button" onClick={() => onStep(step - 1)}>Back</button>}
          {step < 3
            ? <button className="primary-button" onClick={() => onStep(step + 1)}>Continue <Icon name="arrow" /></button>
            : <button className="primary-button" onClick={onFinish}><Icon name="receipt" /> Open decision receipt</button>}
        </div>
      </footer>
    </div>
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

function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="heading-actions">{actions}</div>}</div>;
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
    arrowleft: <path d="M19 12H5m5-5-5 5 5 5"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></>,
    package: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></>,
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
