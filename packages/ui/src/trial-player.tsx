"use client";

import type { ReactNode } from "react";
import { ActionButton } from "./action-button";
import { CitationLink } from "./citation-link";
import { Metric } from "./metric";
import { StatusPill } from "./status-pill";

export type PlayerMetric = {
  id: string;
  label: string;
  value: number;
  displayValue?: string;
  direction?: "higher-is-better" | "lower-is-better";
};

export type PlayerEvidence = {
  id: string;
  label: string;
  detail?: string;
  href?: string;
};

export type PlayerChoice = {
  id: string;
  label: string;
  detail?: string;
};

export type PlayerDebrief = {
  headline: string;
  summary: string;
  scoreLabel: string;
  scoreValue: string;
  strengths: string;
  nextStep: string;
};

export type PlayerScene = {
  title: string;
  situation: string;
  consequence?: string;
  choices: PlayerChoice[];
  evidence: PlayerEvidence[];
};

export type TrialPlayerView = {
  title: string;
  category: string;
  introduction: string;
  roleDescription?: string;
  scene?: PlayerScene;
  metrics: PlayerMetric[];
  evidence: PlayerEvidence[];
  decisionTrace: readonly {
    id: string;
    label: string;
    impact: string;
  }[];
  stage: "briefing" | "playing" | "finished";
  debrief?: PlayerDebrief;
  restartLabel?: string;
};

export type TrialPlayerProps = {
  view: TrialPlayerView;
  onBegin: () => void;
  onChoose: (choiceId: string) => void;
  onRestart: () => void;
  disabled?: boolean;
  notification?: string;
  footer?: ReactNode;
};

function Evidence({ evidence }: { evidence: PlayerEvidence[] }) {
  if (evidence.length === 0) return null;

  return (
    <details className="evidence" open>
      <summary>Evidence pack · {evidence.length} cited source {evidence.length === 1 ? "excerpt" : "excerpts"}</summary>
      <ul>
        {evidence.map((item, index) => (
          <li key={item.id}>
            <CitationLink href={item.href} index={index + 1} target={item.href ? "_blank" : undefined} rel={item.href ? "noreferrer" : undefined}>
              <span>
                {item.label}
                {item.detail ? ` — ${item.detail}` : ""}
              </span>
            </CitationLink>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function TrialPlayer({ view, onBegin, onChoose, onRestart, disabled = false, notification, footer }: TrialPlayerProps) {
  const scene = view.scene;
  const isBriefing = view.stage === "briefing";
  const isFinished = view.stage === "finished";

  return (
    <main className="trial-shell">
      <div className="trial-frame">
        <header className="trial-topbar">
          <a className="brand" href="/" aria-label="SkillTrials home">
            <span className="brand-mark" aria-hidden="true">S</span>
            <span>skill<span>trials</span></span>
          </a>
          <span className="trial-type">Grounded decision simulation</span>
        </header>

        <div aria-atomic="true" aria-live="polite" className="sr-only">
          {notification}
        </div>

        {isBriefing ? (
          <section className="trial-grid" aria-labelledby="briefing-title">
            <div className="trial-main">
              <p className="product-kicker"><span aria-hidden="true" />Playable trial</p>
              <h1 className="trial-heading" id="briefing-title">{view.title}</h1>
              <p className="trial-lede">{view.introduction}</p>
              <div className="briefing">
                <p className="eyebrow">Your brief</p>
                <p>{view.roleDescription ?? "Read the available evidence, decide what to do, and watch the state change. There are no hidden model calls during the run."}</p>
              </div>
              <ActionButton onClick={onBegin} disabled={disabled}>Begin the trial</ActionButton>
            </div>
            <aside className="metric-rail" aria-label="Starting conditions">
              <h2>Starting conditions</h2>
              {view.metrics.map((metric) => <Metric key={metric.id} {...metric} />)}
            </aside>
          </section>
        ) : (
          <>
            <header className="player-header">
              <div className="player-kicker">
                <StatusPill>{isFinished ? "Cited debrief" : "Decision room"}</StatusPill>
                <p className="eyebrow">{view.category}</p>
              </div>
              <h1 className="player-title">{isFinished ? view.debrief?.headline ?? "Run complete" : scene?.title ?? view.title}</h1>
              {!isFinished && scene ? <p className="player-context">{scene.situation}</p> : null}
            </header>

            <div className="player-layout">
              <section className="situation" aria-labelledby="decision-heading">
                {isFinished && view.debrief ? (
                  <>
                    <p className="product-kicker"><span aria-hidden="true" />Evidence-backed debrief</p>
                    <h2 id="decision-heading">{view.debrief.summary}</h2>
                    <div className="debrief-grid">
                      <div className="debrief-card">
                        <h3>{view.debrief.scoreLabel}</h3>
                        <p>{view.debrief.scoreValue}</p>
                      </div>
                      <div className="debrief-card">
                        <h3>What worked</h3>
                        <p>{view.debrief.strengths}</p>
                      </div>
                      <div className="debrief-card">
                        <h3>Practice next</h3>
                        <p>{view.debrief.nextStep}</p>
                      </div>
                    </div>
                    <div className="decision-list">
                      <ActionButton onClick={onRestart} intent="secondary">{view.restartLabel ?? "Restart trial"}</ActionButton>
                    </div>
                  </>
                ) : scene ? (
                  <>
                    <p className="product-kicker"><span aria-hidden="true" />Decision point</p>
                    <h2 id="decision-heading">Choose the move you can defend.</h2>
                    <p className="situation__body">Each action changes the operational state. Read the evidence pack, then commit to the next move.</p>
                    {scene.consequence ? (
                      <div className="consequence" role="status">
                        <strong>What changed</strong>
                        <p>{scene.consequence}</p>
                      </div>
                    ) : null}
                    <Evidence evidence={scene.evidence} />
                    <div className="decision-list" role="group" aria-labelledby="decision-heading">
                      {scene.choices.map((choice, index) => (
                        <button className="decision" disabled={disabled} key={choice.id} onClick={() => onChoose(choice.id)} type="button">
                          <span className="decision__key" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                          <span className="decision__title">{choice.label}</span>
                          {choice.detail ? <span className="decision__detail">{choice.detail}</span> : null}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="eyebrow">No decision available</p>
                    <h2 id="decision-heading">This trial cannot continue.</h2>
                    <p className="situation__body">The sample has no valid next node. Restarting restores its original state.</p>
                    <div className="decision-list"><ActionButton onClick={onRestart} intent="secondary">{view.restartLabel ?? "Restart trial"}</ActionButton></div>
                  </>
                )}
                {isFinished ? <Evidence evidence={view.evidence} /> : null}
              </section>
              <aside className="metric-rail" aria-label="Operational state">
                <h2>Operational state</h2>
                {view.metrics.map((metric) => <Metric key={metric.id} {...metric} />)}
                <section className="decision-trace" aria-label="Decision trace">
                  <p className="eyebrow">Decision trace</p>
                  {view.decisionTrace.length === 0 ? (
                    <p className="decision-trace__empty">No commitment yet. Your first move will leave a visible record.</p>
                  ) : (
                    <ol>
                      {view.decisionTrace.map((entry, index) => (
                        <li key={entry.id}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <strong>{entry.label}</strong>
                          <p>{entry.impact}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </aside>
            </div>
          </>
        )}
        {footer}
      </div>
    </main>
  );
}
