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

type Surface = "command" | "queue" | "case" | "portfolio" | "governance";
type CaseTab = "overview" | "evidence" | "decision" | "communications" | "audit";
type QueueFilter = "All open" | "Due today" | "Evidence gap" | "Specialist review";

const HERO_CASE_ID = "DP-20841";
const NAV: Array<{ id: Surface; label: string; icon: string; group: string }> = [
  { id: "command", label: "Command center", icon: "grid", group: "OPERATIONS" },
  { id: "queue", label: "Dispute queue", icon: "inbox", group: "OPERATIONS" },
  { id: "portfolio", label: "Portfolio intelligence", icon: "chart", group: "INTELLIGENCE" },
  { id: "governance", label: "Governance & controls", icon: "shield", group: "INTELLIGENCE" },
];

export default function Home() {
  const [surface, setSurface] = useState<Surface>("command");
  const [caseTab, setCaseTab] = useState<CaseTab>("overview");
  const [caseId, setCaseId] = useState(HERO_CASE_ID);
  const [uploads, setUploads] = useState<Record<string, Evidence[]>>({});
  const [toast, setToast] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");

  const baseCase = CASES.find((item) => item.id === caseId) ?? CASES[0];
  const selectedCase = useMemo(
    () => ({ ...baseCase, evidence: [...baseCase.evidence, ...(uploads[baseCase.id] ?? [])] }),
    [baseCase, uploads],
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function openCase(nextId: string, tab: CaseTab = "overview") {
    setCaseId(nextId);
    setCaseTab(tab);
    setSurface("case");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addEvidence(file: File) {
    const raw = await file.text();
    let parsed: Partial<Evidence> = {};
    if (file.name.toLowerCase().endsWith(".json")) {
      try {
        parsed = JSON.parse(raw) as Partial<Evidence>;
      } catch {
        notify("JSON could not be parsed; imported as unstructured text");
      }
    }

    const evidence: Evidence = {
      id: `upload-${Date.now()}`,
      label: parsed.label ?? file.name.replace(/\.[^.]+$/, "").replaceAll(/[-_]/g, " "),
      type: parsed.type ?? "uploaded_record",
      source: parsed.source ?? "analyst_upload",
      supports: parsed.supports ?? "neutral",
      reliability: typeof parsed.reliability === "number"
        ? Math.max(0, Math.min(1, parsed.reliability))
        : 0.55,
      verified: false,
      detail: parsed.detail ?? (raw.slice(0, 220) || "Locally supplied evidence"),
    };

    setUploads((current) => ({
      ...current,
      [caseId]: [...(current[caseId] ?? []), evidence],
    }));
    notify(`${evidence.label} added to the evidence ledger`);
  }

  const surfaceLabel = surface === "case"
    ? `${selectedCase.id} / ${caseTab}`
    : NAV.find((item) => item.id === surface)?.label ?? "ProofPair";

  return (
    <div className="product-shell">
      <aside className="product-rail">
        <button className="brand-lockup" onClick={() => setSurface("command")} aria-label="Open command center">
          <BrandMark />
          <span><strong>ProofPair</strong><small>RESOLUTION CONTROL</small></span>
        </button>

        <nav aria-label="Primary navigation">
          {["OPERATIONS", "INTELLIGENCE"].map((group) => (
            <div className="nav-group" key={group}>
              <small>{group}</small>
              {NAV.filter((item) => item.group === group).map((item) => (
                <button
                  className={surface === item.id ? "active" : ""}
                  onClick={() => setSurface(item.id)}
                  aria-current={surface === item.id ? "page" : undefined}
                  key={item.id}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.id === "queue" && <b>{CASES.length}</b>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="rail-status">
          <span><i /> RULE SERVICE</span>
          <strong>Operational</strong>
          <small>PP policy registry · v1.0</small>
        </div>
      </aside>

      <div className="product-frame">
        <header className="topbar">
          <div className="breadcrumb">
            <span>DISPUTE OPERATIONS</span>
            <Icon name="chevron" />
            <strong>{surfaceLabel}</strong>
          </div>
          <label className="global-search">
            <Icon name="search" />
            <input
              value={globalQuery}
              onChange={(event) => setGlobalQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setSurface("queue");
                  notify(globalQuery ? `Queue filtered for “${globalQuery}”` : "Dispute queue opened");
                }
              }}
              placeholder="Search cases, members, merchants"
              aria-label="Search all disputes"
            />
            <kbd>↵</kbd>
          </label>
          <div className="topbar-actions">
            <span className="environment">SYNTHETIC SANDBOX</span>
            <button aria-label="Open notifications"><Icon name="bell" /><i>2</i></button>
            <span className="analyst-identity"><b>AS</b><span><strong>Alex Smith</strong><small>Senior analyst</small></span></span>
          </div>
        </header>

        <main className="product-main">
          {surface === "command" && <CommandCenter openCase={openCase} openQueue={() => setSurface("queue")} />}
          {surface === "queue" && <DisputeQueue openCase={openCase} initialQuery={globalQuery} />}
          {surface === "case" && (
            <CaseWorkspace
              item={selectedCase}
              tab={caseTab}
              setTab={setCaseTab}
              openCase={openCase}
              addEvidence={addEvidence}
              notify={notify}
            />
          )}
          {surface === "portfolio" && <PortfolioIntelligence openCase={openCase} />}
          {surface === "governance" && <Governance item={selectedCase} setCaseId={setCaseId} />}
        </main>
      </div>

      {toast && <div className="toast" role="status"><Icon name="check" /> {toast}</div>}
    </div>
  );
}

function CommandCenter({ openCase, openQueue }: { openCase: (id: string, tab?: CaseTab) => void; openQueue: () => void }) {
  const metrics = operationsMetrics();
  const priority = CASES.slice().sort((a, b) => a.slaHours - b.slaHours);
  const reasonCounts = Object.values(REASON_CODES).map((rule) => ({
    label: rule.short,
    count: CASES.filter((item) => REASON_CODES[item.code].short === rule.short).length,
  })).filter((row) => row.count);

  return (
    <div className="screen command-screen">
      <PageLead
        eyebrow="MONDAY, 27 JULY · US DISPUTE OPERATIONS"
        title="Resolution command center"
        description="Prioritize exposure, inspect evidence readiness, and move every case through a governed decision path."
        actions={<>
          <button className="button primary" onClick={() => openCase(HERO_CASE_ID)}>Open priority case <Icon name="arrow" /></button>
          <button className="button secondary" onClick={openQueue}>View complete queue</button>
        </>}
      />

      <section className="metric-ledger" aria-label="Operational metrics">
        <Metric value={String(metrics.total)} label="Open sample cases" detail="Across five reason codes" />
        <Metric value={String(CASES.filter((item) => item.slaHours <= 8).length)} label="SLA at risk" detail="Due within eight hours" danger />
        <Metric value={`${metrics.automationRate}%`} label="Recommendation ready" detail="Synthetic rule coverage" />
        <Metric value={`${metrics.fairnessPassed}/${metrics.fairnessTotal}`} label="Property checks" detail="Across current sample set" />
      </section>

      <div className="command-grid">
        <section className="module priority-module">
          <ModuleHeader kicker="PRIORITY WORK" title="Cases requiring attention" action={<button onClick={openQueue}>OPEN QUEUE <Icon name="arrow" /></button>} />
          <div className="dense-table">
            <div className="dense-row dense-head">
              <span>CASE</span><span>PARTIES</span><span>EXPOSURE</span><span>READINESS</span><span>SLA</span><span />
            </div>
            {priority.slice(0, 4).map((item) => {
              const result = evaluateCase(item);
              return (
                <button className="dense-row" onClick={() => openCase(item.id)} key={item.id}>
                  <span><strong>{item.id}</strong><small>{REASON_CODES[item.code].short}</small></span>
                  <span><strong>{item.merchant}</strong><small>{item.member}</small></span>
                  <span><strong>{money(item)}</strong><small>{item.currency}</small></span>
                  <span><EvidenceStatus result={result} /></span>
                  <span className={item.slaHours <= 8 ? "sla critical" : "sla"}><strong>{item.slaHours}h</strong><small>remaining</small></span>
                  <span><Icon name="arrow" /></span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="module workload-module">
          <ModuleHeader kicker="WORKLOAD" title="Reason-code mix" />
          <div className="workload-bars">
            {reasonCounts.map((row) => (
              <div key={row.label}>
                <span><strong>{row.label}</strong><small>{row.count} case{row.count > 1 ? "s" : ""}</small></span>
                <i><b style={{ width: `${Math.max(18, row.count * 42)}%` }} /></i>
              </div>
            ))}
          </div>
          <div className="coverage-note">
            <strong>5 rule packs active</strong>
            <p>Coverage is intentionally narrow. Unsupported codes must route to specialist review.</p>
          </div>
        </section>

        <section className="module integrity-module">
          <ModuleHeader kicker="CONTROL HEALTH" title="Decision-path integrity" />
          <div className="control-list">
            <ControlRow label="Rule registry" value="5 active · 0 draft" status="healthy" />
            <ControlRow label="Evidence provenance" value="100% source-tagged" status="healthy" />
            <ControlRow label="Behavioral assurance" value="24 of 24 passed" status="healthy" />
            <ControlRow label="External root anchoring" value="Not connected" status="limited" />
          </div>
        </section>

        <section className="module activity-module">
          <ModuleHeader kicker="LIVE OPERATIONS" title="Recent case activity" />
          <Timeline compact />
        </section>
      </div>
    </div>
  );
}

function DisputeQueue({ openCase, initialQuery }: { openCase: (id: string, tab?: CaseTab) => void; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<QueueFilter>("All open");
  const [selected, setSelected] = useState<string[]>([]);

  const rows = CASES.filter((item) => {
    const result = evaluateCase(item);
    const haystack = `${item.id} ${item.merchant} ${item.member} ${item.code}`.toLowerCase();
    const queryMatch = haystack.includes(query.toLowerCase());
    const filterMatch =
      filter === "All open" ||
      (filter === "Due today" && item.slaHours <= 8) ||
      (filter === "Evidence gap" && result.missing.length > 0) ||
      (filter === "Specialist review" && result.outcome === "human_escalation");
    return queryMatch && filterMatch;
  });

  return (
    <div className="screen queue-screen">
      <PageLead
        eyebrow="WORK MANAGEMENT"
        title="Dispute queue"
        description="A single operational view of deadlines, exposure, evidence readiness, and recommended routing."
        actions={<button className="button primary" onClick={() => openCase(HERO_CASE_ID)}>Review next case <Icon name="arrow" /></button>}
      />

      <section className="queue-controlbar">
        <label>
          <Icon name="search" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter this queue" />
        </label>
        <div className="view-tabs" aria-label="Saved queue views">
          {(["All open", "Due today", "Evidence gap", "Specialist review"] as QueueFilter[]).map((name) => (
            <button className={filter === name ? "active" : ""} onClick={() => setFilter(name)} aria-pressed={filter === name} key={name}>
              {name}
            </button>
          ))}
        </div>
        <button className="text-action"><Icon name="sliders" /> COLUMNS</button>
        <button className="text-action"><Icon name="download" /> EXPORT</button>
      </section>

      {selected.length > 0 && (
        <div className="bulk-bar">
          <strong>{selected.length} selected</strong>
          <button>Assign analyst</button>
          <button>Change priority</button>
          <button>Route to specialist</button>
          <button onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      <section className="enterprise-table queue-enterprise">
        <div className="enterprise-row enterprise-head">
          <span><input type="checkbox" aria-label="Select all visible cases" /></span>
          <span>CASE / REASON</span><span>MERCHANT / MEMBER</span><span>AMOUNT</span><span>EVIDENCE</span><span>RECOMMENDATION</span><span>OWNER</span><span>SLA</span><span />
        </div>
        {rows.map((item) => {
          const result = evaluateCase(item);
          const isSelected = selected.includes(item.id);
          return (
            <div className={`enterprise-row ${isSelected ? "selected" : ""}`} key={item.id}>
              <span><input
                type="checkbox"
                checked={isSelected}
                onChange={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}
                aria-label={`Select ${item.id}`}
              /></span>
              <button onClick={() => openCase(item.id)}><strong>{item.id}</strong><small>Code {item.code} · {REASON_CODES[item.code].short}</small></button>
              <span><strong>{item.merchant}</strong><small>{item.member}</small></span>
              <span><strong>{money(item)}</strong><small>{item.currency}</small></span>
              <span><EvidenceStatus result={result} /></span>
              <span><OutcomeLabel outcome={result.outcome} /></span>
              <span><strong>{item.id === HERO_CASE_ID ? "A. Smith" : "Unassigned"}</strong><small>{item.queue}</small></span>
              <span className={item.slaHours <= 8 ? "sla critical" : "sla"}><strong>{item.slaHours}h</strong><small>remaining</small></span>
              <button className="open-row" onClick={() => openCase(item.id)} aria-label={`Open ${item.id}`}><Icon name="arrow" /></button>
            </div>
          );
        })}
        {rows.length === 0 && <div className="empty-table"><strong>No matching disputes</strong><span>Change the search or saved view.</span></div>}
      </section>
      <footer className="table-footer"><span>Showing {rows.length} of {CASES.length} synthetic cases</span><span>Last refreshed just now</span></footer>
    </div>
  );
}

function CaseWorkspace({
  item,
  tab,
  setTab,
  openCase,
  addEvidence,
  notify,
}: {
  item: DisputeCase;
  tab: CaseTab;
  setTab: (tab: CaseTab) => void;
  openCase: (id: string, tab?: CaseTab) => void;
  addEvidence: (file: File) => Promise<void>;
  notify: (message: string) => void;
}) {
  const result = evaluateCase(item);
  const tabs: Array<{ id: CaseTab; label: string; count?: number }> = [
    { id: "overview", label: "Case overview" },
    { id: "evidence", label: "Evidence room", count: item.evidence.length },
    { id: "decision", label: "Decision studio" },
    { id: "communications", label: "Communications", count: 2 },
    { id: "audit", label: "Audit trail", count: 4 },
  ];

  return (
    <div className="case-screen">
      <header className="case-context">
        <div className="case-context-main">
          <span className="case-kicker">CASE {item.id} · REASON CODE {item.code}</span>
          <h1>{REASON_CODES[item.code].name}</h1>
          <p>{item.merchant} <i>versus</i> {item.member}</p>
        </div>
        <div className="case-context-facts">
          <span><small>DISPUTED AMOUNT</small><strong>{money(item)} {item.currency}</strong></span>
          <span><small>FILED</small><strong>{item.ageDays} days ago</strong></span>
          <span className={item.slaHours <= 8 ? "critical" : ""}><small>DECISION SLA</small><strong>{item.slaHours} hours</strong></span>
          <select value={item.id} onChange={(event) => openCase(event.target.value, tab)} aria-label="Choose a sample case">
            {CASES.map((entry) => <option value={entry.id} key={entry.id}>{entry.id} · {REASON_CODES[entry.code].short}</option>)}
          </select>
        </div>
      </header>

      <nav className="case-tabs" aria-label="Case workspace">
        {tabs.map((entry) => (
          <button className={tab === entry.id ? "active" : ""} onClick={() => setTab(entry.id)} aria-current={tab === entry.id ? "page" : undefined} key={entry.id}>
            {entry.label}{entry.count !== undefined && <b>{entry.count}</b>}
          </button>
        ))}
      </nav>

      {tab === "overview" && <CaseOverview item={item} result={result} setTab={setTab} notify={notify} />}
      {tab === "evidence" && <EvidenceRoom item={item} result={result} addEvidence={addEvidence} setTab={setTab} />}
      {tab === "decision" && <DecisionStudio item={item} notify={notify} key={item.id} />}
      {tab === "communications" && <Communications item={item} notify={notify} key={item.id} />}
      {tab === "audit" && <AuditTrail item={item} result={result} />}
    </div>
  );
}

function CaseOverview({ item, result, setTab, notify }: { item: DisputeCase; result: Evaluation; setTab: (tab: CaseTab) => void; notify: (message: string) => void }) {
  const memberEvidence = item.evidence.filter((entry) => entry.supports === "member");
  const merchantEvidence = item.evidence.filter((entry) => entry.supports === "merchant");

  return (
    <div className="workspace-layout">
      <div className="workspace-primary">
        <section className="module narrative-module">
          <ModuleHeader kicker="DISPUTE NARRATIVE" title="What happened" action={<button onClick={() => notify("Narrative editor opened in demo mode")}><Icon name="edit" /> EDIT</button>} />
          <p className="editorial-copy">{item.narrative}</p>
          {result.contradictions.length > 0 && (
            <div className="conflict-register">
              <span>CONFLICT {result.contradictions[0].severity.toUpperCase()}</span>
              <strong>{result.contradictions[0].label}</strong>
              <p>Resolve the inconsistency or document why specialist escalation is the safer path.</p>
              <button onClick={() => setTab("evidence")}>Inspect conflicting records <Icon name="arrow" /></button>
            </div>
          )}
        </section>

        <section className="module party-summary-module">
          <ModuleHeader kicker="TWO-SIDED RECORD" title="Party positions" action={<button onClick={() => setTab("communications")}>REQUEST EVIDENCE <Icon name="arrow" /></button>} />
          <div className="party-summary-grid">
            <PartySummary party="CARD MEMBER" name={item.member} evidence={memberEvidence} position="Disputes the transaction and requests reversal." />
            <PartySummary party="MERCHANT" name={item.merchant} evidence={merchantEvidence} position="Defends fulfilment based on supplied records." />
          </div>
        </section>

        <section className="module transaction-module">
          <ModuleHeader kicker="NETWORK RECORD" title="Transaction and filing details" />
          <div className="fact-grid">
            <Fact label="Transaction amount" value={`${money(item)} ${item.currency}`} />
            <Fact label="Card product" value="Platinum ·•9214" />
            <Fact label="Transaction date" value="08 Apr 2026" />
            <Fact label="Filing date" value={`${item.ageDays} days after transaction`} />
            <Fact label="Acquirer reference" value="740649261091" />
            <Fact label="Merchant category" value="5732 · Electronics" />
            <Fact label="Channel" value="Card-not-present" />
            <Fact label="Jurisdiction" value="United States" />
          </div>
        </section>

        <section className="module">
          <ModuleHeader kicker="CASE CHRONOLOGY" title="Activity and handoffs" />
          <Timeline item={item} result={result} />
        </section>
      </div>

      <aside className="workspace-aside">
        <RecommendationPanel result={result} item={item} setTab={setTab} notify={notify} />
        <section className="side-module">
          <h2>CASE CONTROL</h2>
          <ControlLine label="Owner" value="Alex Smith" />
          <ControlLine label="Priority" value={item.slaHours <= 8 ? "P1 · At risk" : "P2 · Standard"} />
          <ControlLine label="Queue" value={item.queue} />
          <ControlLine label="Policy" value={result.ruleVersion} />
          <button onClick={() => notify("Assignment panel opened in demo mode")}>CHANGE ASSIGNMENT</button>
        </section>
        <section className="side-module tasks-module">
          <h2>REVIEW CHECKLIST</h2>
          <Task checked label="Identity and transaction matched" />
          <Task checked={result.checks.requiredEvidenceComplete} label="Required records present" />
          <Task checked={result.checks.contradictionReviewed} label="Contradictions addressed" />
          <Task checked={false} label="Analyst decision recorded" />
        </section>
      </aside>
    </div>
  );
}

function EvidenceRoom({ item, result, addEvidence, setTab }: { item: DisputeCase; result: Evaluation; addEvidence: (file: File) => Promise<void>; setTab: (tab: CaseTab) => void }) {
  const rule = REASON_CODES[item.code];
  const groups = [
    { id: "neutral", label: "SHARED / NETWORK RECORD", entries: item.evidence.filter((entry) => entry.supports === "neutral") },
    { id: "member", label: `CARD MEMBER · ${item.member.toUpperCase()}`, entries: item.evidence.filter((entry) => entry.supports === "member") },
    { id: "merchant", label: `MERCHANT · ${item.merchant.toUpperCase()}`, entries: item.evidence.filter((entry) => entry.supports === "merchant") },
  ];

  return (
    <div className="evidence-workspace">
      <div className="evidence-toolbar">
        <div><span>EVIDENCE ROOM</span><strong>{item.evidence.length} records · {result.missing.length} required gaps · {result.contradictions.length} conflicts</strong></div>
        <label className="button primary upload-button">
          <input
            type="file"
            accept=".txt,.json,text/plain,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void addEvidence(file);
              event.target.value = "";
            }}
          />
          <Icon name="plus" /> Add record
        </label>
      </div>

      <div className="evidence-layout">
        <section className="evidence-ledger">
          {groups.map((group) => (
            <div className="evidence-group" key={group.id}>
              <header><span>{group.label}</span><b>{group.entries.length}</b></header>
              {group.entries.map((entry) => <EvidenceRecord evidence={entry} decisive={result.decisiveEvidence.includes(entry.id)} key={entry.id} />)}
              {group.entries.length === 0 && <p className="no-records">No records received from this source.</p>}
            </div>
          ))}
        </section>

        <aside className="evidence-inspector">
          <section>
            <h2>REQUIREMENT COVERAGE</h2>
            {[...rule.required, ...rule.decisive].map((type) => {
              const present = item.evidence.some((entry) => entry.type === type);
              const required = rule.required.includes(type);
              return (
                <div className="requirement-row" key={type}>
                  <Icon name={present ? "check" : required ? "alert" : "minus"} />
                  <span><strong>{humanize(type)}</strong><small>{required ? "Required" : "Decisive when available"}</small></span>
                  <b>{present ? "PRESENT" : required ? "MISSING" : "ABSENT"}</b>
                </div>
              );
            })}
          </section>
          <section>
            <h2>PROVENANCE STATUS</h2>
            <ControlLine label="Network-linked" value={String(item.evidence.filter((entry) => entry.source === "network").length)} />
            <ControlLine label="Third-party sourced" value={String(item.evidence.filter((entry) => !["member", "merchant", "network"].includes(entry.source)).length)} />
            <ControlLine label="Submitted by party" value={String(item.evidence.filter((entry) => ["member", "merchant"].includes(entry.source)).length)} />
            <ControlLine label="Unverified uploads" value={String(item.evidence.filter((entry) => !entry.verified).length)} />
          </section>
          <section className="evidence-next">
            <span>NEXT CONTROL POINT</span>
            <strong>{result.missing.length ? "Request missing evidence" : "Evidence record is review-ready"}</strong>
            <p>{result.missing.length ? `${result.missing.map(humanize).join(", ")} must be supplied or explicitly waived.` : "Move to the decision studio to inspect the policy trace."}</p>
            <button className="button primary" onClick={() => setTab(result.missing.length ? "communications" : "decision")}>
              {result.missing.length ? "Draft evidence request" : "Open decision studio"} <Icon name="arrow" />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DecisionStudio({ item, notify }: { item: DisputeCase; notify: (message: string) => void }) {
  const [simulation, setSimulation] = useState<Evaluation | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const baseline = evaluateCase(item);
  const result = simulation ?? baseline;
  const memberEvidence = item.evidence.filter((entry) => entry.supports === "member" && entry.verified);
  const merchantEvidence = item.evidence.filter((entry) => entry.supports === "merchant" && entry.verified);

  return (
    <div className="decision-workspace">
      <div className="decision-main">
        <section className="decision-hero">
          <span>GOVERNED RECOMMENDATION · {result.ruleVersion}</span>
          <h1>{formatOutcome(result.outcome)}</h1>
          <p>{result.rationale}</p>
          <div>
            <button className="button primary" onClick={() => setReceiptOpen(true)}>Review decision receipt <Icon name="arrow" /></button>
            <button className="button secondary" onClick={() => notify("Case routed to specialist review")}>Route to specialist</button>
          </div>
        </section>

        <section className="module">
          <ModuleHeader kicker="EVIDENCE WEIGHT LEDGER" title="Every configured signal remains inspectable" />
          <div className="weight-ledger">
            <EvidenceWeightColumn label="CARD MEMBER" entries={memberEvidence} />
            <div className="weight-axis"><span>STRONGER VERIFIED RECORD</span><i /><b>VERSUS</b><i /></div>
            <EvidenceWeightColumn label="MERCHANT" entries={merchantEvidence} />
          </div>
          <p className="method-note">Signal strength is a prototype rule input—not a calibrated probability. No demographic attribute is used in the configured path.</p>
        </section>

        <section className="module">
          <ModuleHeader kicker="POLICY TRACE" title="Versioned rule checks" />
          <div className="policy-table">
            <div><span>CONTROL</span><span>RESULT</span><span>EXPLANATION</span></div>
            {Object.entries(result.checks).map(([name, pass]) => (
              <div key={name}>
                <strong>{humanize(name)}</strong>
                <b className={pass ? "pass" : "review"}>{pass ? "PASSED" : "REVIEW"}</b>
                <span>{pass ? "Satisfied by the current record." : "The rule path cannot safely clear this control."}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="scenario-panel">
        <span>COUNTERFACTUAL LAB</span>
        <h2>Challenge the recommendation</h2>
        <p>Change one evidence condition at a time. The source case is never mutated.</p>
        <button onClick={() => setSimulation(simulateCase(item, { removeEvidenceId: item.evidence[1]?.id }))}>
          <Icon name="minus" /><span><strong>Remove a required record</strong><small>Tests abstention behavior</small></span>
        </button>
        <button onClick={() => setSimulation(simulateCase(item, { party: "merchant", reliabilityDelta: 0.15 }))}>
          <Icon name="plus" /><span><strong>Strengthen merchant record</strong><small>Tests evidence monotonicity</small></span>
        </button>
        <button onClick={() => setSimulation(simulateCase(item, { addContradiction: true }))}>
          <Icon name="alert" /><span><strong>Introduce a conflict</strong><small>Tests safe escalation</small></span>
        </button>
        <div className="scenario-comparison">
          <span><small>BASELINE</small><strong>{formatOutcome(baseline.outcome)}</strong></span>
          <Icon name="arrow" />
          <span><small>SCENARIO</small><strong>{formatOutcome(result.outcome)}</strong></span>
        </div>
        {simulation && <button className="reset-scenario" onClick={() => setSimulation(null)}>RESET TO SOURCE CASE</button>}
      </aside>

      {receiptOpen && <DecisionReceipt item={item} result={result} onClose={() => setReceiptOpen(false)} />}
    </div>
  );
}

function Communications({ item, notify }: { item: DisputeCase; notify: (message: string) => void }) {
  const result = evaluateCase(item);
  const [audience, setAudience] = useState<"member" | "merchant">("merchant");
  const missing = result.missing.map(humanize).join(", ");
  const initialDraft = audience === "merchant"
    ? `We are reviewing dispute ${item.id}. Please provide ${missing || "any material fulfilment evidence"} within 7 calendar days. Include source dates and reference numbers.`
    : `We are reviewing dispute ${item.id}. Your case remains open while we compare the records supplied by both parties. No account action has been taken by this prototype.`;
  const [draft, setDraft] = useState(initialDraft);

  function changeAudience(next: "member" | "merchant") {
    setAudience(next);
    setDraft(next === "merchant"
      ? `We are reviewing dispute ${item.id}. Please provide ${missing || "any material fulfilment evidence"} within 7 calendar days. Include source dates and reference numbers.`
      : `We are reviewing dispute ${item.id}. Your case remains open while we compare the records supplied by both parties. No account action has been taken by this prototype.`);
  }

  return (
    <div className="communications-layout">
      <section className="communication-history">
        <ModuleHeader kicker="CASE CORRESPONDENCE" title="Messages and evidence requests" action={<button onClick={() => notify("Communication filters opened")}>FILTER</button>} />
        <article>
          <header><span>MC</span><div><strong>{item.member}</strong><small>Card member · Secure message</small></div><time>{item.ageDays} days ago</time></header>
          <p>I did not receive the order and the delivery information does not match my address. Please review the attached declaration.</p>
          <footer><Icon name="file" /> Member declaration.pdf · Verified</footer>
        </article>
        <article>
          <header><span>NA</span><div><strong>{item.merchant}</strong><small>Merchant · Evidence portal</small></div><time>{Math.max(item.ageDays - 2, 1)} days ago</time></header>
          <p>The order was fulfilled using our standard carrier service. We have supplied the order confirmation and delivery scan.</p>
          <footer><Icon name="file" /> 2 records received</footer>
        </article>
        <div className="system-message"><Icon name="alert" /><span><strong>Evidence conflict detected</strong><small>Delivery destination does not reconcile with the verified transaction record.</small></span></div>
      </section>

      <aside className="composer">
        <span>CONTROLLED OUTREACH</span>
        <h2>Draft evidence request</h2>
        <div className="audience-switch">
          <button className={audience === "member" ? "active" : ""} onClick={() => changeAudience("member")}>Card member</button>
          <button className={audience === "merchant" ? "active" : ""} onClick={() => changeAudience("merchant")}>Merchant</button>
        </div>
        <label>TO<input value={audience === "member" ? item.member : item.merchant} readOnly /></label>
        <label>SUBJECT<input value={`Additional evidence requested · ${item.id}`} readOnly /></label>
        <label>MESSAGE<textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={9} /></label>
        <div className="deadline-control"><span><small>RESPONSE DUE</small><strong>03 Aug 2026</strong></span><button>CHANGE</button></div>
        <button className="button primary wide" onClick={() => notify(`Demo message queued for ${audience}`)}>Queue secure message <Icon name="arrow" /></button>
        <p><Icon name="shield" /> Demo only. No external message is sent.</p>
      </aside>
    </div>
  );
}

function AuditTrail({ item, result }: { item: DisputeCase; result: Evaluation }) {
  const suite = runFairnessSuite(item);
  return (
    <div className="audit-layout">
      <section className="module audit-events">
        <ModuleHeader kicker="EVENT HISTORY" title="Immutable-intent case log" action={<button><Icon name="download" /> EXPORT JSON</button>} />
        {[
          ["CASE_CREATED", "Case created from synthetic network transaction", "system", `${item.ageDays} days ago`],
          ["EVIDENCE_RECEIVED", `${item.evidence.length} records normalized with source metadata`, "evidence-service", "2 days ago"],
          ["CONFLICT_CHECKED", result.contradictions[0]?.label ?? "No configured contradictions detected", "rule-service", "Today · 10:06"],
          ["RECOMMENDATION_CREATED", `${formatOutcome(result.outcome)} under ${result.ruleVersion}`, "resolution-service", "Today · 10:08"],
        ].map(([event, detail, actor, time], index) => (
          <div className="audit-event" key={event}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><strong>{event}</strong><p>{detail}</p><small>Actor: {actor}</small></div>
            <time>{time}</time>
          </div>
        ))}
      </section>
      <aside className="audit-aside">
        <section>
          <span>BEHAVIORAL ASSURANCE</span>
          <h2>{suite.filter((test) => test.pass).length} of {suite.length} checks passed</h2>
          {suite.map((test) => <div key={test.id}><Icon name={test.pass ? "check" : "alert"} /><span><strong>{test.name}</strong><small>{test.transformation}</small></span><b>{test.pass ? "PASS" : "REVIEW"}</b></div>)}
        </section>
        <section className="truth-boundary">
          <span>TRUTH BOUNDARY</span>
          <h2>What this log does not prove</h2>
          <p>It is an in-session prototype record. It is not externally anchored, independently audited, or connected to AMEX production systems.</p>
        </section>
      </aside>
    </div>
  );
}

function PortfolioIntelligence({ openCase }: { openCase: (id: string, tab?: CaseTab) => void }) {
  const metrics = operationsMetrics();
  const outcomes = CASES.map((item) => ({ item, result: evaluateCase(item) }));
  return (
    <div className="screen portfolio-screen">
      <PageLead
        eyebrow="SYNTHETIC PORTFOLIO · SIX SAMPLE CASES"
        title="Operational intelligence"
        description="Inspect workload, reason-code coverage, evidence gaps, and outcome patterns without presenting synthetic results as production impact."
        actions={<button className="button secondary"><Icon name="download" /> Export snapshot</button>}
      />
      <section className="metric-ledger">
        <Metric value={String(CASES.reduce((sum, item) => sum + item.amount, 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }))} label="Sample exposure" detail="Not a forecast or savings claim" />
        <Metric value={`${metrics.automationRate}%`} label="Rule-ready" detail="Within configured sample" />
        <Metric value={String(metrics.escalated)} label="Specialist routed" detail="Ambiguity preserved" />
        <Metric value={String(metrics.atRisk)} label="SLA at risk" detail="Eight hours or less" danger />
      </section>
      <div className="portfolio-grid">
        <section className="module">
          <ModuleHeader kicker="REASON-CODE COVERAGE" title="Workload and readiness" />
          <div className="portfolio-reason-table">
            <div><span>CODE</span><span>DISPUTE TYPE</span><span>CASES</span><span>EXPOSURE</span><span>READY</span></div>
            {Object.entries(REASON_CODES).map(([code, rule]) => {
              const cases = CASES.filter((item) => item.code === code);
              if (!cases.length) return null;
              return <div key={code}><strong>{code}</strong><span>{rule.name}</span><b>{cases.length}</b><span>${cases.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span><span>{cases.filter((item) => evaluateCase(item).outcome !== "human_escalation").length}/{cases.length}</span></div>;
            })}
          </div>
        </section>
        <section className="module outcome-module">
          <ModuleHeader kicker="ROUTING DISTRIBUTION" title="Configured outcomes" />
          {[
            ["Card member", outcomes.filter(({ result }) => result.outcome === "member_win").length, "#016FD0"],
            ["Merchant", outcomes.filter(({ result }) => result.outcome === "merchant_win").length, "#002663"],
            ["Specialist", outcomes.filter(({ result }) => result.outcome === "human_escalation").length, "#8A5A00"],
          ].map(([label, count, color]) => (
            <div className="outcome-bar" key={String(label)}>
              <span><strong>{label}</strong><b>{count}</b></span>
              <i><b style={{ width: `${Number(count) / CASES.length * 100}%`, background: String(color) }} /></i>
            </div>
          ))}
        </section>
        <section className="module risk-register">
          <ModuleHeader kicker="RISK REGISTER" title="Cases requiring human attention" />
          {outcomes.filter(({ item, result }) => item.slaHours <= 8 || result.outcome === "human_escalation").map(({ item, result }) => (
            <button onClick={() => openCase(item.id, "decision")} key={item.id}>
              <span><strong>{item.id}</strong><small>{REASON_CODES[item.code].short}</small></span>
              <OutcomeLabel outcome={result.outcome} />
              <b>{item.slaHours}h</b>
              <Icon name="arrow" />
            </button>
          ))}
        </section>
        <section className="module limitation-module">
          <ModuleHeader kicker="ANALYTIC BOUNDARY" title="Claims intentionally withheld" />
          <p>No savings, accuracy, cycle-time reduction, or population fairness claim can be inferred from six synthetic cases. Production measurement would require labeled outcomes, policy-complete coverage, cohort monitoring, and independent review.</p>
        </section>
      </div>
    </div>
  );
}

function Governance({ item, setCaseId }: { item: DisputeCase; setCaseId: (id: string) => void }) {
  const suite = runFairnessSuite(item);
  return (
    <div className="screen governance-screen">
      <PageLead
        eyebrow="MODEL & POLICY GOVERNANCE"
        title="Controls before automation"
        description="Version rule packs, test behavioral properties, preserve human authority, and expose every mocked integration."
        actions={<select value={item.id} onChange={(event) => setCaseId(event.target.value)}>{CASES.map((entry) => <option value={entry.id} key={entry.id}>{entry.id} · {entry.code}</option>)}</select>}
      />
      <div className="governance-grid">
        <section className="module assurance-module">
          <ModuleHeader kicker={`BEHAVIORAL ASSURANCE · ${item.id}`} title={`${suite.filter((test) => test.pass).length} of ${suite.length} properties passed`} />
          {suite.map((test) => (
            <article key={test.id}>
              <span>{test.id}</span>
              <div><h2>{test.name}</h2><p>{test.transformation}</p></div>
              <div><small>EXPECTED</small><strong>{test.expected.replaceAll("_", " ")}</strong></div>
              <div><small>ACTUAL</small><strong>{test.actual.replaceAll("_", " ")}</strong></div>
              <b className={test.pass ? "pass" : "review"}>{test.pass ? "PASS" : "REVIEW"}</b>
            </article>
          ))}
          <footer>Passing synthetic properties does not establish real-world fairness. Proxy discrimination and distribution shift remain open risks.</footer>
        </section>

        <section className="module rule-registry">
          <ModuleHeader kicker="POLICY REGISTRY" title="Active reason-code packs" action={<button>VIEW CHANGE LOG</button>} />
          {Object.entries(REASON_CODES).map(([code, rule]) => (
            <div key={code}>
              <span><strong>{code}</strong><small>{rule.category}</small></span>
              <span><strong>{rule.short}</strong><small>{rule.required.length} required · {rule.decisive.length} decisive types</small></span>
              <b>PP-{code}-1.0</b>
              <i>ACTIVE</i>
            </div>
          ))}
        </section>

        <section className="module authority-module">
          <ModuleHeader kicker="AUTHORITY MATRIX" title="Human control is structural" />
          <div><span>CAPABILITY</span><span>PROTOTYPE</span><span>PRODUCTION INTENT</span></div>
          <div><strong>Read case data</strong><b>Local synthetic</b><span>Scoped service access</span></div>
          <div><strong>Recommend outcome</strong><b>Enabled</b><span>Policy-constrained</span></div>
          <div><strong>Move money</strong><b>Blocked</b><span>Separate authorized service</span></div>
          <div><strong>Update account</strong><b>Blocked</b><span>Dual-control action</span></div>
          <div><strong>Override policy</strong><b>Blocked</b><span>Named specialist only</span></div>
        </section>

        <section className="module integration-registry">
          <ModuleHeader kicker="INTEGRATION REGISTRY" title="Truthful system boundary" />
          <ControlRow label="Transaction network" value="Synthetic fixture" status="limited" />
          <ControlRow label="Merchant evidence portal" value="UI stub only" status="limited" />
          <ControlRow label="Document OCR" value="Not implemented" status="limited" />
          <ControlRow label="Identity & account" value="Not connected" status="limited" />
          <ControlRow label="External audit anchor" value="Not connected" status="limited" />
          <ControlRow label="Rule evaluation" value="Implemented locally" status="healthy" />
        </section>
      </div>
    </div>
  );
}

function RecommendationPanel({ result, item, setTab, notify }: { result: Evaluation; item: DisputeCase; setTab: (tab: CaseTab) => void; notify: (message: string) => void }) {
  return (
    <section className="recommendation-panel">
      <span>GOVERNED RECOMMENDATION</span>
      <OutcomeLabel outcome={result.outcome} />
      <h2>{formatOutcome(result.outcome)}</h2>
      <p>{result.rationale}</p>
      <div>
        <ControlLine label="Required evidence" value={result.missing.length ? `${result.missing.length} missing` : "Complete"} />
        <ControlLine label="Policy deadline" value={result.checks.deadlineEligible ? "Eligible" : "Review"} />
        <ControlLine label="Contradiction control" value={result.checks.contradictionReviewed ? "Passed" : "Review"} />
      </div>
      <button className="button primary wide" onClick={() => setTab("decision")}>Open decision studio <Icon name="arrow" /></button>
      <button className="button secondary wide" onClick={() => notify(`${item.id} routed to specialist review`)}>Route to specialist</button>
      <small><Icon name="shield" /> Recommendation only. No account action is available.</small>
    </section>
  );
}

function DecisionReceipt({ item, result, onClose }: { item: DisputeCase; result: Evaluation; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="decision-receipt" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
        <header>
          <span><BrandMark /><span><strong>PROOFPAIR DECISION RECEIPT</strong><small>{item.id} · {result.ruleVersion}</small></span></span>
          <button onClick={onClose} aria-label="Close receipt">×</button>
        </header>
        <div className="receipt-content">
          <span>RECOMMENDED NEXT STEP</span>
          <h1 id="receipt-title">{formatOutcome(result.outcome)}</h1>
          <p>{result.rationale}</p>
          <div className="receipt-facts">
            <Fact label="Disputed amount" value={`${money(item)} ${item.currency}`} />
            <Fact label="Card member" value={item.member} />
            <Fact label="Merchant" value={item.merchant} />
            <Fact label="Rule version" value={result.ruleVersion} />
          </div>
          <h2>CONTROL RESULTS</h2>
          {Object.entries(result.checks).map(([name, pass]) => (
            <div className="receipt-check" key={name}><strong>{humanize(name)}</strong><b className={pass ? "pass" : "review"}>{pass ? "PASSED" : "REVIEW"}</b></div>
          ))}
          <div className="receipt-boundary"><Icon name="shield" /><p>This receipt explains an in-session prototype recommendation. It does not execute an account action and is not externally anchored.</p></div>
        </div>
        <footer><button className="button secondary" onClick={() => window.print()}>Print / save PDF</button><button className="button primary" onClick={onClose}>Close receipt</button></footer>
      </section>
    </div>
  );
}

function PageLead({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <header className="page-lead"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</header>;
}

function ModuleHeader({ kicker, title, action }: { kicker: string; title: string; action?: React.ReactNode }) {
  return <header className="module-header"><div><span>{kicker}</span><h2>{title}</h2></div>{action}</header>;
}

function Metric({ value, label, detail, danger = false }: { value: string; label: string; detail: string; danger?: boolean }) {
  return <div className={danger ? "metric danger" : "metric"}><strong>{value}</strong><span>{label}</span><small>{detail}</small></div>;
}

function PartySummary({ party, name, evidence, position }: { party: string; name: string; evidence: Evidence[]; position: string }) {
  return <article><span>{party}</span><h3>{name}</h3><p>{position}</p><footer><strong>{evidence.length} records supplied</strong><button>VIEW RECORDS <Icon name="arrow" /></button></footer></article>;
}

function EvidenceRecord({ evidence, decisive }: { evidence: Evidence; decisive: boolean }) {
  return (
    <article className="evidence-record">
      <span className="file-type"><Icon name="file" /></span>
      <div><strong>{evidence.label}</strong><p>{evidence.detail}</p><small>{humanize(evidence.source)} · {humanize(evidence.type)}</small></div>
      <span className="record-flags">{decisive && <b>DECISIVE</b>}<i className={evidence.verified ? "verified" : "submitted"}>{evidence.verified ? "VERIFIED" : "SUBMITTED"}</i></span>
      <button aria-label={`Inspect ${evidence.label}`}><Icon name="chevron" /></button>
    </article>
  );
}

function EvidenceWeightColumn({ label, entries }: { label: string; entries: Evidence[] }) {
  return <div className="weight-column"><span>{label}</span>{entries.map((entry) => <div key={entry.id}><strong>{entry.label}</strong><i><b style={{ width: `${entry.reliability * 100}%` }} /></i><small>{Math.round(entry.reliability * 100)} configured points</small></div>)}</div>;
}

function EvidenceStatus({ result }: { result: Evaluation }) {
  return <span className={result.missing.length ? "evidence-status gap" : "evidence-status ready"}><Icon name={result.missing.length ? "alert" : "check"} />{result.missing.length ? `${result.missing.length} required gap${result.missing.length > 1 ? "s" : ""}` : "Review-ready"}</span>;
}

function OutcomeLabel({ outcome }: { outcome: string }) {
  const className = outcome === "human_escalation" ? "specialist" : outcome === "member_win" ? "member" : "merchant";
  return <span className={`outcome-label ${className}`}><i />{outcome === "human_escalation" ? "Specialist review" : outcome === "member_win" ? "Card member" : "Merchant"}</span>;
}

function ControlRow({ label, value, status }: { label: string; value: string; status: "healthy" | "limited" }) {
  return <div className="control-row"><i className={status} /><span><strong>{label}</strong><small>{value}</small></span><b>{status === "healthy" ? "CONTROLLED" : "LIMITED"}</b></div>;
}

function ControlLine({ label, value }: { label: string; value: string }) {
  return <span className="control-line"><small>{label}</small><strong>{value}</strong></span>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <span className="fact"><small>{label}</small><strong>{value}</strong></span>;
}

function Task({ checked, label }: { checked: boolean; label: string }) {
  return <label className="task"><input type="checkbox" checked={checked} readOnly /><span>{label}</span></label>;
}

function Timeline({ item = CASES[0], result = evaluateCase(CASES[0]), compact = false }: { item?: DisputeCase; result?: Evaluation; compact?: boolean }) {
  const events = [
    ["Case opened", `${item.member} filed a ${REASON_CODES[item.code].short.toLowerCase()} dispute`, `${item.ageDays} days ago`],
    ["Evidence normalized", `${item.evidence.length} records linked to their submitting source`, "2 days ago"],
    [result.contradictions.length ? "Conflict detected" : "Rule controls checked", result.contradictions[0]?.label ?? "No configured contradiction found", "Today · 10:06"],
    ["Recommendation ready", `${formatOutcome(result.outcome)} under ${result.ruleVersion}`, "Today · 10:08"],
  ];
  return <div className={compact ? "timeline compact" : "timeline"}>{events.map(([name, detail, time]) => <div key={name}><i /><span><strong>{name}</strong><small>{detail}</small></span><time>{time}</time></div>)}</div>;
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><i /><i /></span>;
}

function money(item: DisputeCase) {
  return item.amount.toLocaleString("en-US", { style: "currency", currency: item.currency });
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    alert: <><path d="M12 3 2 21h20L12 3Z" /><path d="M12 9v5M12 18h.01" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20V7" /><path d="M2 20h22" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M4 21h16" /></>,
    edit: <><path d="m4 20 4-1 11-11-3-3L5 16l-1 4Z" /><path d="m14 7 3 3" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    inbox: <><path d="M4 5h16v14H4z" /><path d="M4 14h5l2 3h2l2-3h5" /></>,
    minus: <path d="M5 12h14" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    sliders: <><path d="M4 7h16M4 17h16M8 4v6M16 14v6" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] ?? paths.file}</svg>;
}
