"use client";

import {
  blockedEvidenceFixture,
  createReleaseReceipt,
  destructiveMigrationFixture,
  eligibleEvidenceFixture,
  evaluateReleaseGate,
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
  const hasDemoProof = evidence.length === eligibleEvidenceFixture.length;

  const applyDemoProof = () => {
    setEvidence(eligibleEvidenceFixture);
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
              <div><p className="eyebrow">Proposed production change</p><h2 id="command-title">{destructiveMigrationFixture.service}</h2></div>
              <span>production</span>
            </div>
            <code>{destructiveMigrationFixture.command}</code>
            <p>{destructiveMigrationFixture.migrationSummary}</p>
            <pre aria-label="Migration SQL"><code>{destructiveMigrationFixture.migrationSql}</code></pre>
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
          {!hasDemoProof ? (
            <button className="ui-action ui-action--primary" onClick={applyDemoProof} type="button">Apply demo proof</button>
          ) : (
            <>
              <button className="ui-action ui-action--primary" disabled={isCreatingReceipt} onClick={createReceipt} type="button">{isCreatingReceipt ? "Creating receipt…" : "Create release receipt"}</button>
              <button className="text-action" onClick={resetDemo} type="button">Reset unsafe release</button>
            </>
          )}
          <p className="provenance-note">Demo proof is labelled <strong>demo fixture</strong>. It is not a live infrastructure integration and the app never executes this command.</p>
          {receipt ? <section className="receipt" aria-labelledby="receipt-title"><p className="eyebrow">Immutable receipt</p><h2 id="receipt-title">Eligible at {new Date(receipt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</h2><dl><div><dt>Command fingerprint</dt><dd>{receipt.fingerprint}</dd></div><div><dt>Policy</dt><dd>{receipt.policyId} v{receipt.policyVersion}</dd></div><div><dt>Evidence</dt><dd>{receipt.controls.filter((control) => control.status === "satisfied").length} matched records</dd></div></dl></section> : null}
        </aside>
      </section>
    </main>
  );
}
