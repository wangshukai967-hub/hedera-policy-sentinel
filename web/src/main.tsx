import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Check,
  CircleDollarSign,
  FileLock2,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Send,
  Settings,
  ShieldCheck,
  ShieldX,
  UserRoundCheck,
  X,
} from "lucide-react";
import "./styles.css";

type Scenario = "allowed" | "blocked" | "approval";

const scenarios = {
  allowed: {
    request: "Pay 40 HBAR to 0.0.800800 for cloud-infrastructure",
    recipient: "0.0.800800",
    amount: "40 HBAR",
    purpose: "cloud-infrastructure",
    decision: "ALLOWED",
    code: "ALLOW",
    reason: "Every deterministic policy rule passed.",
    checks: [true, true, true, true, true, true],
  },
  blocked: {
    request: "Pay 25 HBAR to 0.0.999999 for approved-vendor",
    recipient: "0.0.999999",
    amount: "25 HBAR",
    purpose: "approved-vendor",
    decision: "BLOCKED",
    code: "RECIPIENT_NOT_ALLOWED",
    reason: "Recipient is not on the policy allowlist.",
    checks: [false, true, true, true, true, true],
  },
  approval: {
    request: "Pay 300 HBAR to 0.0.800800 for approved-vendor",
    recipient: "0.0.800800",
    amount: "300 HBAR",
    purpose: "approved-vendor",
    decision: "BLOCKED",
    code: "HUMAN_APPROVAL_REQUIRED",
    reason: "High-value payment needs a request-bound approval.",
    checks: [true, true, true, true, true, false],
  },
} as const;

const checkLabels = [
  "Recipient allowlist",
  "Approved purpose",
  "Single payment limit",
  "Active hours",
  "Daily limit",
  "Human approval",
];

function App() {
  const [scenario, setScenario] = useState<Scenario>("approval");
  const [approved, setApproved] = useState(false);
  const data = scenarios[scenario];
  const isAllowed = data.decision === "ALLOWED" || (scenario === "approval" && approved);
  const checks = scenario === "approval" && approved ? [true, true, true, true, true, true] : [...data.checks];

  const events = useMemo(() => {
    const base = [
      "Payment request received",
      "Intent parsed by AI agent",
      "Policy checks executed",
      `Decision: ${isAllowed ? "ALLOWED" : `BLOCKED (${data.code})`}`,
    ];
    base.push(isAllowed ? "Decision anchored to HCS" : "Human intervention required");
    if (approved) base.push("Request-bound approval verified");
    return base;
  }, [approved, data.code, isAllowed]);

  function changeScenario(next: Scenario) {
    setScenario(next);
    setApproved(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><ShieldCheck size={35} /><span>Policy<br />Sentinel</span></div>
        <nav>
          <button className="active"><LayoutDashboard />Dashboard</button>
          <button><ListChecks />Policies</button>
          <button><FileLock2 />Audit trail</button>
          <button><Settings />Settings</button>
        </nav>
        <div className="network"><span /><div><strong>Connected</strong><small>Hedera Testnet</small></div></div>
      </aside>

      <main>
        <header>
          <h1>Policy Sentinel</h1>
          <p>AI proposes. Policy decides.</p>
        </header>

        <section className="content">
          <label className="request-label">Payment request</label>
          <div className="request-box">
            <span>{data.request}</span>
            <button aria-label="Run payment request"><Send /></button>
          </div>

          <div className="workflow">
            <div className="left-panel panel">
              <h2>Parsed intent</h2>
              <dl>
                <div><dt>Recipient</dt><dd>{data.recipient}</dd></div>
                <div><dt>Amount</dt><dd>{data.amount}</dd></div>
                <div><dt>Purpose</dt><dd>{data.purpose}</dd></div>
              </dl>
              <div className="policy-title"><h2>Policy checks</h2><span>Deterministic</span></div>
              <div className="checks">
                {checkLabels.map((label, index) => (
                  <div key={label}>
                    <span className={checks[index] ? "check pass" : "check fail"}>{checks[index] ? <Check /> : <X />}</span>
                    <strong>{label}</strong>
                    <em className={checks[index] ? "pass-text" : "fail-text"}>{checks[index] ? "PASS" : "FAIL"}</em>
                  </div>
                ))}
              </div>
            </div>

            <div className="right-stack">
              <div className="decision panel">
                <h2>Decision</h2>
                <div className={isAllowed ? "decision-state allowed" : "decision-state blocked"}>
                  {isAllowed ? <ShieldCheck /> : <ShieldX />}
                  <div><strong>{isAllowed ? "ALLOWED" : "BLOCKED"}</strong><span>{isAllowed ? "ALLOW" : data.code}</span></div>
                </div>
                <div className="decision-detail">
                  <div><b>{scenario === "approval" ? "Human approval" : "Policy result"}</b><p>{isAllowed ? "Payment is cleared for Hedera execution." : data.reason}</p></div>
                  {scenario === "approval" && !approved && <button onClick={() => setApproved(true)}>Approve request</button>}
                </div>
              </div>

              <div className="audit panel">
                <div className="audit-heading"><h2>HCS audit trail</h2><span><LockKeyhole />Decision anchored</span></div>
                <ol>
                  {events.map((event, index) => <li key={`${event}-${index}`}><span /><strong>{event}</strong><time>14:32:{String(10 + index).padStart(2, "0")} UTC</time></li>)}
                </ol>
              </div>
            </div>
          </div>

          <section className="scenarios">
            <div><h2>Run scenario</h2><p>Show how policy remains in control of agent payments.</p></div>
            <div className="scenario-buttons">
              <button className={scenario === "allowed" ? "selected good" : "good"} onClick={() => changeScenario("allowed")}><Check />Allowed payment</button>
              <button className={scenario === "blocked" ? "selected bad" : "bad"} onClick={() => changeScenario("blocked")}><X />Blocked recipient</button>
              <button className={scenario === "approval" ? "selected warn" : "warn"} onClick={() => changeScenario("approval")}><UserRoundCheck />Requires approval</button>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
