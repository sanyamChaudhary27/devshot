"use client";

import {
  blockedEvidenceFixture,
  createReleaseReceipt,
  destructiveMigrationFixture,
  eligibleEvidenceFixture,
  evaluateReleaseGate,
  invalidRollbackEvidenceFixture,
  migrationRunbookFixture,
  type EvidenceRecord,
  type ReleaseReceipt
} from "@skilltrials/domain";
import Link from "next/link";
import { useMemo, useState } from "react";

const citationFor = (citationId: string) => migrationRunbookFixture.citations.find((citation) => citation.id === citationId);

export function ReleaseDesk() {
  const [evidence, setEvidence] = useState<readonly EvidenceRecord[]>(blockedEvidenceFixture);
  const [receipt, setReceipt] = useState<ReleaseReceipt | null>(null);
  const [isCreatingReceipt, setIsCreatingReceipt] = useState(false);
  const result = useMemo(
    () => evaluateReleaseGate(migrationRunbookFixture, destructiveMigrationFixture, evidence),
    [evidence]
  );
  const blockingFailures = result.controls.filter((control) => control.control.severity === "blocking" && control.status !== "satisfied").length;
  const proofRecords = eligibleEvidenceFixture.filter((record) => record.controlId !== "service-impact");
  const attachedProofs = evidence.filter((record) => record.controlId !== "service-impact" && record.status === "valid").length;
  const attachProof = (record: EvidenceRecord) => {
    setEvidence((current) => current.some((candidate) => candidate.id === record.id) ? current : [...current, record]);
    setReceipt(null);
  };

  const resetDemo = () => {
    setEvidence(blockedEvidenceFixture);
    setReceipt(null);
  };

  const createReceipt = async () => {
    setIsCreatingReceipt(true);
    try {
      setReceipt(await createReleaseReceipt(migrationRunbookFixture, destructiveMigrationFixture, result, new Date().toISOString()));
    } finally {
      setIsCreatingReceipt(false);
    }
  };

  return (
    <main className="firewall-shell">
      <header className="firewall-nav">
        <Link className="brand" href="/" aria-label="Runbook Firewall home">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>runbook<span>firewall</span></span>
        </Link>
        <span className="firewall-nav__status">Demo policy · {migrationRunbookFixture.version}.0</span>
      </header>

      <section className="release-brief" aria-labelledby="release-title">
        <div>
          <p className="product-kicker"><span aria-hidden="true" />Pre-execution release gate</p>
          <h1 id="release-title">Can this migration run?</h1>
          <p>Runbook Firewall compiles the team&apos;s prose safeguards into cited controls. The command is not eligible until the required proof is present.</p>
        </div>
        <aside className={`verdict verdict--${result.status.toLowerCase()}`} aria-live="polite">
          <span>Release verdict</span>
          <strong>{result.status}</strong>
          <p>{result.status === "BLOCKED" ? `${blockingFailures} blocking safeguard${blockingFailures === 1 ? "" : "s"} missing.` : "Every blocking safeguard has matching evidence."}</p>
        </aside>
      </section>

      <section className="release-workspace" aria-label="Release gate workspace">
        <div className="release-main">
          <section className="command-card" aria-labelledby="command-title">
            <div className="section-heading">
              <div><p className="eyebrow">Merge under review</p><h2 id="command-title">{destructiveMigrationFixture.service}</h2></div>
              <span>{destructiveMigrationFixture.environment}</span>
            </div>
            <div className="revision-compare"><div><span>Stable</span><strong>{destructiveMigrationFixture.baseRevision}</strong></div><span aria-hidden="true">→</span><div><span>Upcoming merge</span><strong>{destructiveMigrationFixture.proposedRevision}</strong></div></div>
            <code>{destructiveMigrationFixture.command}</code>
            <p>{destructiveMigrationFixture.migrationSummary}</p>
            <pre aria-label="Migration SQL"><code>{destructiveMigrationFixture.migrationSql}</code></pre>
            <ul className="changed-files" aria-label="Changed files in proposed merge">{destructiveMigrationFixture.changedFiles.map((file) => <li key={file.path}><code>{file.path}</code><span>+{file.additions} / −{file.deletions}</span></li>)}</ul>
          </section>

          <section className="risk-strip" aria-label="Deterministic risk signals">
            <p className="eyebrow">Deterministic risk analysis</p>
            <ul>
              {result.riskSignals.map((signal) => <li className={`risk-pill risk-pill--${signal.level}`} key={signal.id}><strong>{signal.label}</strong><span>{signal.detail}</span></li>)}
            </ul>
          </section>

          <section className="control-ledger" aria-labelledby="controls-title">
            <div className="section-heading"><div><p className="eyebrow">Cited control ledger</p><h2 id="controls-title">Show the command, show the proof.</h2></div><span>{result.controls.length} controls</span></div>
            <ol>
              {result.controls.map((item) => {
                const citationId = item.control.citationIds.at(0);
                const citation = citationId === undefined ? undefined : citationFor(citationId);
                return (
                  <li className={`control-row control-row--${item.status}`} key={item.control.id}>
                    <div className="control-row__state"><span>{item.status === "satisfied" ? "Pass" : item.status === "invalid" ? "Invalid" : "Missing"}</span><small>{item.control.severity}</small></div>
                    <div className="control-row__body">
                      <h3>{item.control.label}</h3>
                      <p>{item.control.requirement}</p>
                      {citation ? <blockquote><span>{citation.label}</span> “{citation.quote}”</blockquote> : null}
                      <p className="control-row__reason">{item.reason}</p>
                      {item.evidence ? <p className="control-row__evidence"><strong>Evidence:</strong> {item.evidence.value} <em>{item.evidence.provenance.replaceAll("_", " ")}</em></p> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="release-rail" aria-label="Release actions">
          <section>
            <p className="eyebrow">Runbook source</p>
            <h2>{migrationRunbookFixture.title}</h2>
            <p>Five typed safeguards were compiled from a versioned runbook. The bundled demo needs no model call.</p>
          </section>
          <section className="proof-inbox" aria-labelledby="proof-title">
            <div className="section-heading"><div><p className="eyebrow">Proof inbox</p><h2 id="proof-title">{attachedProofs}/{proofRecords.length} records attached</h2></div></div>
            <p>Attach each record to the release before asking the gate to open.</p>
            <ul>
              {proofRecords.map((record) => {
                const control = migrationRunbookFixture.controls.find((candidate) => candidate.id === record.controlId);
                const attached = evidence.some((candidate) => candidate.id === record.id);
                return <li className={attached ? "is-attached" : undefined} key={record.id}>
                  <div><strong>{control?.label ?? "Required evidence"}</strong><span>{record.value}</span></div>
                  <button disabled={attached} onClick={() => attachProof(record)} type="button">{attached ? "Attached" : "Attach"}</button>
                </li>;
              })}
            </ul>
            {!evidence.some((record) => record.id === invalidRollbackEvidenceFixture.id) ? <button className="proof-inbox__rejection" onClick={() => attachProof(invalidRollbackEvidenceFixture)} type="button">Test an unproven rollback</button> : null}
          </section>
          {result.status === "ELIGIBLE" ? <button className="ui-action ui-action--primary" disabled={isCreatingReceipt} onClick={createReceipt} type="button">{isCreatingReceipt ? "Creating receipt…" : "Create release receipt"}</button> : null}
          <button className="text-action" onClick={resetDemo} type="button">Reset unsafe release</button>
          <p className="provenance-note">These records are labelled <strong>demo fixture</strong>. Production integrations would need explicit verification adapters; this app never executes the command.</p>
          {receipt ? <section className="receipt" aria-labelledby="receipt-title"><p className="eyebrow">Immutable receipt</p><h2 id="receipt-title">Eligible at {new Date(receipt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</h2><dl><div><dt>Command fingerprint</dt><dd>{receipt.fingerprint}</dd></div><div><dt>Policy</dt><dd>{receipt.policyId} v{receipt.policyVersion}</dd></div><div><dt>Evidence</dt><dd>{receipt.controls.filter((control) => control.status === "satisfied").length} matched records</dd></div></dl></section> : null}
        </aside>
      </section>
    </main>
  );
}
