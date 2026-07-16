"use client";

import { scenarioSchema, type Scenario } from "@skilltrials/domain";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ScenarioTrial } from "../scenario-trial";

type Status = "idle" | "generating" | "failed";
type GenerationResponse = { scenario?: unknown; attempts?: unknown; trial?: { id?: unknown; slug?: unknown; status?: unknown }; error?: unknown; details?: unknown; sourceRetained?: unknown };

const exampleSource = `Incident response policy\n\nClassify an incident as P1 when checkout is unavailable for a material share of customers. For a P1 incident, page the incident commander and payments on-call immediately. Use a documented rollback or feature flag before restarting payment services. Post a customer-facing status update after the incident commander confirms scope.`;

const isScenario = (value: unknown): value is Scenario => scenarioSchema.safeParse(value).success;

const errorMessage = (payload: GenerationResponse): string => {
  const detail = Array.isArray(payload.details) && typeof payload.details[0] === "string" ? ` ${payload.details[0]}` : "";
  const retained = payload.sourceRetained === true ? " Your source remains private; correct the brief or retry safely." : "";
  return `${typeof payload.error === "string" ? payload.error : "Generation failed."}${detail}${retained}`;
};

const supportedSourceFile = (file: File): boolean =>
  file.type === "text/plain" || file.type === "text/markdown" || /\.(?:txt|md)$/i.test(file.name);

const titleFromFile = (name: string): string => name.replace(/\.(?:txt|md)$/i, "").replace(/[-_]+/g, " ").trim();

export function CreateTrial() {
  const [title, setTitle] = useState("Payment incident policy");
  const [sourceText, setSourceText] = useState(exampleSource);
  const [audience, setAudience] = useState("New incident commanders");
  const [difficulty, setDifficulty] = useState<"introductory" | "intermediate" | "advanced">("introductory");
  const [publicEvidenceEnabled, setPublicEvidenceEnabled] = useState(false);
  const [attributionUrl, setAttributionUrl] = useState("");
  const [attributionTitle, setAttributionTitle] = useState("");
  const [licenseNotice, setLicenseNotice] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("Paste a policy, lesson, or runbook. SkillTrials will only publish a scenario that passes source and graph checks.");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [draftSlug, setDraftSlug] = useState<string | null>(null);

  const loadSourceFile = async (file: File | undefined): Promise<void> => {
    if (file === undefined) return;
    if (!supportedSourceFile(file)) {
      setStatus("failed");
      setMessage("Use a plain-text or Markdown file (.txt or .md). Other formats are deliberately outside this MVP.");
      return;
    }
    try {
      const text = await file.text();
      if (text.trim().length < 80) throw new Error("That file needs at least 80 characters of source material.");
      if (text.length > 40_000) throw new Error("That file is over the 40,000-character source limit. Use a focused excerpt.");
      setSourceText(text);
      if (title === "Payment incident policy") setTitle(titleFromFile(file.name) || title);
      setStatus("idle");
      setMessage(`Loaded ${file.name}. Review the text before generating; it will be stored privately if you continue.`);
    } catch (caught) {
      setStatus("failed");
      setMessage(caught instanceof Error ? caught.message : "The selected source file could not be read.");
    }
  };

  const generate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("generating");
    setScenario(null);
    setMessage("Generating the scenario and running source, schema, and reachability checks.");
    try {
      const response = await fetch("/api/trials/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: crypto.randomUUID(),
          sourceTitle: title,
          sourceText,
          brief: { audience, difficulty, estimatedMinutes: 5 },
          publicEvidence: { enabled: publicEvidenceEnabled, ...(publicEvidenceEnabled ? { attributionUrl, attributionTitle, licenseNotice, rightsConfirmed } : {}) }
        })
      });
      const payload = await response.json().catch(() => ({})) as GenerationResponse;
      if (!response.ok || !isScenario(payload.scenario)) throw new Error(errorMessage(payload));
      setScenario(payload.scenario);
      setDraftSlug(typeof payload.trial?.slug === "string" ? payload.trial.slug : null);
      setStatus("idle");
      setMessage(`Verified trial ready after ${payload.attempts === 2 ? "one repair pass" : "its first validation pass"}.`);
    } catch (caught) {
      setStatus("failed");
      setMessage(caught instanceof Error ? caught.message : "Generation failed. No trial was published.");
    }
  };

  if (scenario !== null) {
    return <><aside className="draft-banner"><p><strong>Verified draft saved.</strong> This scenario is private until you publish it.</p><Link className="ui-action ui-action--secondary" href="/dashboard">Review and publish</Link>{draftSlug ? <span>Draft: {draftSlug}</span> : null}</aside><ScenarioTrial key={scenario.id} scenario={scenario} category="Generated source trial" roleDescription="You are practicing a source-grounded decision scenario. Each visible claim is tied to a quoted source excerpt; no model calls occur while you play." /></>;
  }

  return <main className="create-shell">
    <header className="create-topbar"><Link className="wordmark" href="/">skill<span>trials</span></Link><Link className="text-link" href="/sample">View the sample</Link></header>
    <section className="create-intro"><p className="eyebrow">Author workspace</p><h1>Turn a source into a decision trial.</h1><p>SkillTrials uses the supplied material as its only factual authority. It checks exact quotes, citations, graph reachability, and terminal outcomes before it lets anyone play.</p></section>
    <form className="create-form" onSubmit={generate}>
      <div className="field-row"><label>Source title<input value={title} minLength={2} maxLength={240} onChange={(event) => setTitle(event.target.value)} required /></label><label>Learner audience<input value={audience} minLength={2} maxLength={160} onChange={(event) => setAudience(event.target.value)} required /></label></div>
      <fieldset><legend>Difficulty</legend>{(["introductory", "intermediate", "advanced"] as const).map((option) => <label className="radio" key={option}><input checked={difficulty === option} name="difficulty" onChange={() => setDifficulty(option)} type="radio" value={option} />{option}</label>)}</fieldset>
      <label>Import a source file <input accept=".txt,.md,text/plain,text/markdown" onChange={(event) => { void loadSourceFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} type="file" /></label>
      <label>Source text<textarea value={sourceText} minLength={80} maxLength={40_000} onChange={(event) => setSourceText(event.target.value)} required rows={14} /></label>
      <p className="field-note">{sourceText.length.toLocaleString()} / 40,000 characters. Paste text or import a .txt/.md file; the accepted source is stored privately and sent server-side to OpenAI only to generate and verify this trial.</p>
      <fieldset><legend>Public evidence</legend><label className="radio"><input checked={publicEvidenceEnabled} onChange={(event) => setPublicEvidenceEnabled(event.target.checked)} type="checkbox" />Share source excerpts on the public trial.</label>{publicEvidenceEnabled ? <><label>Public source URL <input onChange={(event) => setAttributionUrl(event.target.value)} placeholder="https://…" required type="url" value={attributionUrl} /></label><label>Attribution title <input onChange={(event) => setAttributionTitle(event.target.value)} required value={attributionTitle} /></label><label>License or permission note <input onChange={(event) => setLicenseNotice(event.target.value)} placeholder="Example: Public-domain government publication" required value={licenseNotice} /></label><label className="radio"><input checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} required type="checkbox" />I confirm I have the right to share these excerpts publicly.</label></> : <p className="field-note">Private is the default. Public links redact source excerpts unless you provide attribution, a license/permission note, and explicit rights confirmation.</p>}</fieldset>
      <button className="ui-action" disabled={status === "generating"} type="submit">{status === "generating" ? "Generating and verifying…" : status === "failed" ? "Retry generation" : "Generate playable trial"}</button>
      <p className={status === "failed" ? "form-message form-message--error" : "form-message"} aria-live="polite">{message}</p>
    </form>
  </main>;
}
