"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

type Finding = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  explanation: string;
  filePaths: readonly string[];
  runbookLines: readonly number[];
};

type Safeguard = {
  id: string;
  label: string;
  status: "required" | "not_required";
  explanation: string;
  runbookLines: readonly number[];
};

type Review = {
  repository: string;
  compareUrl: string;
  baseRevision: string;
  proposedRevision: string;
  changedFiles: readonly { path: string; status: string; additions: number; deletions: number }[];
  analysis: {
    verdict: "BLOCK" | "REVIEW" | "READY";
    summary: string;
    findings: readonly Finding[];
    safeguards: readonly Safeguard[];
    nextActions: readonly string[];
  };
};

const initialRunbook = "";

export function ReleaseDesk() {
  const [stableUrl, setStableUrl] = useState("");
  const [upcomingUrl, setUpcomingUrl] = useState("");
  const [runbook, setRunbook] = useState(initialRunbook);
  const [review, setReview] = useState<Review | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadRunbookFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    if (file.size > 100_000) {
      setMessage("The runbook must be smaller than 100 KB.");
      return;
    }
    try {
      setRunbook(await file.text());
      setMessage(`Loaded ${file.name}.`);
    } catch {
      setMessage("That file could not be read as plain text.");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsReviewing(true);
    setMessage(null);
    setReview(null);
    try {
      const response = await fetch("/api/release/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stableUrl, upcomingUrl, runbook })
      });
      const payload = await response.json().catch(() => ({})) as Review & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The release could not be reviewed.");
      setReview(payload);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The release could not be reviewed.");
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <main className="release-review-shell">
      <header className="review-nav">
        <Link className="brand" href="/" aria-label="Runbook Firewall home"><span className="brand-mark" aria-hidden="true">R</span><span>runbook<span>firewall</span></span></Link>
        <span>GitHub merge review</span>
      </header>

      <section className="review-intro">
        <p className="product-kicker"><span aria-hidden="true" />Release intelligence</p>
        <h1>Should this merge ship?</h1>
        <p>Give Runbook Firewall the stable release, the proposed release, and the team&apos;s runbook. It fetches the real GitHub compare, asks GPT-5.6 to map changes to safeguards, and returns a cited release decision.</p>
      </section>

      <form className="review-form" onSubmit={submit}>
        <div className="review-step"><span>01</span><div><h2>Two GitHub releases</h2><p>Paste a public GitHub branch, tag, or commit URL for each revision.</p></div></div>
        <label>Stable release URL<input aria-label="Stable release GitHub URL" autoComplete="url" onChange={(event) => setStableUrl(event.target.value)} placeholder="https://github.com/acme/payments/tree/main" required type="url" value={stableUrl} /></label>
        <label>Upcoming release URL<input aria-label="Upcoming release GitHub URL" autoComplete="url" onChange={(event) => setUpcomingUrl(event.target.value)} placeholder="https://github.com/acme/payments/tree/release/remove-legacy-status" required type="url" value={upcomingUrl} /></label>

        <div className="review-step"><span>02</span><div><h2>Runbook</h2><p>Paste the operational requirements, or load a plain-text or Markdown runbook.</p></div></div>
        <label>Runbook text<textarea aria-label="Runbook text" onChange={(event) => setRunbook(event.target.value)} placeholder={'Example:\nProduction migrations require an approved change ticket, a backup receipt, and a tested rollback command.'} required rows={11} value={runbook} /></label>
        <div className="runbook-file"><input accept=".md,.txt,text/markdown,text/plain" aria-label="Runbook file" onChange={loadRunbookFile} ref={fileInput} type="file" /><button onClick={() => fileInput.current?.click()} type="button">Load .md or .txt</button><span>{runbook.length.toLocaleString()} / 100,000 characters</span></div>

        <button className="review-submit" disabled={isReviewing} type="submit">{isReviewing ? "Fetching compare and analysing…" : "Review this merge"}</button>
        <p className="review-disclosure">Public GitHub comparison only. The browser never receives an OpenAI or GitHub secret, and no command is executed.</p>
        {message ? <p className="review-message" role="alert">{message}</p> : null}
      </form>

      {review ? <section className="review-result" aria-live="polite">
        <div className={`review-verdict review-verdict--${review.analysis.verdict.toLowerCase()}`}><p>GPT-5.6 release decision</p><strong>{review.analysis.verdict}</strong><span>{review.analysis.summary}</span></div>
        <div className="review-meta"><div><span>Repository</span><strong>{review.repository}</strong></div><div><span>Compare</span><a href={review.compareUrl} rel="noreferrer" target="_blank">{review.baseRevision.slice(0, 12)} → {review.proposedRevision.slice(0, 12)}</a></div><div><span>Changed files</span><strong>{review.changedFiles.length}</strong></div></div>
        <section className="review-panel"><h2>What changed</h2><ul className="review-files">{review.changedFiles.map((file) => <li key={file.path}><code>{file.path}</code><span>{file.status} · +{file.additions} / −{file.deletions}</span></li>)}</ul></section>
        <section className="review-panel"><h2>Risks and runbook evidence</h2><ul className="review-findings">{review.analysis.findings.map((finding) => <li className={`finding finding--${finding.severity}`} key={finding.id}><div><span>{finding.severity}</span><h3>{finding.title}</h3></div><p>{finding.explanation}</p>{finding.filePaths.length > 0 ? <small>Files: {finding.filePaths.join(", ")}</small> : null}{finding.runbookLines.length > 0 ? <small>Runbook lines: {finding.runbookLines.join(", ")}</small> : null}</li>)}</ul></section>
        <section className="review-panel"><h2>Required safeguards</h2><ul className="review-safeguards">{review.analysis.safeguards.map((safeguard) => <li key={safeguard.id}><span className={safeguard.status === "required" ? "is-required" : "is-not-required"}>{safeguard.status === "required" ? "Required" : "Not required"}</span><div><h3>{safeguard.label}</h3><p>{safeguard.explanation}</p>{safeguard.runbookLines.length > 0 ? <small>Runbook lines: {safeguard.runbookLines.join(", ")}</small> : null}</div></li>)}</ul></section>
        <section className="review-panel"><h2>Next actions</h2><ol className="review-actions">{review.analysis.nextActions.map((action) => <li key={action}>{action}</li>)}</ol></section>
      </section> : null}
    </main>
  );
}
