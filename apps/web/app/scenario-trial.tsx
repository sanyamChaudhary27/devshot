"use client";

import {
  applyChoice,
  createRuntime,
  scoreRun,
  type Citation,
  type Choice,
  type RuntimeState,
  type Scenario,
  type ScenarioNode
} from "@skilltrials/domain";
import { TrialPlayer, type PlayerEvidence, type TrialPlayerView } from "@skilltrials/ui";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

type ScenarioTrialProps = {
  scenario: Scenario;
  category: string;
  roleDescription: string;
  sourceAttribution?: ReactNode;
};

const nodeFor = (state: RuntimeState): ScenarioNode => {
  const node = state.scenario.nodes.find((candidate) => candidate.id === state.currentNodeId);
  if (node === undefined) throw new Error(`Trial node not found: ${state.currentNodeId}`);
  return node;
};

const citationsFor = (state: RuntimeState, ids: readonly string[]): Citation[] =>
  ids.flatMap((id) => {
    const citation = state.scenario.citations.find((candidate) => candidate.id === id);
    return citation === undefined ? [] : [citation];
  });

const evidenceFromCitations = (state: RuntimeState, ids: readonly string[]): PlayerEvidence[] =>
  citationsFor(state, ids).map((citation) => ({ id: citation.id, label: citation.label, detail: citation.quote }));

const lastChoice = (state: RuntimeState): Choice | undefined => {
  const id = state.selectedChoiceIds.at(-1);
  if (id === undefined) return undefined;
  return state.scenario.nodes
    .flatMap((node) => node.kind === "scene" ? node.choices : [])
    .find((choice) => choice.id === id);
};

const deltaSummary = (state: RuntimeState, choice: Choice | undefined): string | undefined => {
  if (choice === undefined) return undefined;
  const changes = Object.entries(choice.metricDeltas).flatMap(([metricId, delta]) => {
    const metric = state.scenario.metrics.find((candidate) => candidate.id === metricId);
    return metric === undefined || delta === 0 ? [] : [`${metric.label} ${delta > 0 ? "+" : ""}${delta}`];
  });
  return changes.length > 0 ? changes.join(" · ") : undefined;
};

const decisionTraceFor = (state: RuntimeState): TrialPlayerView["decisionTrace"] =>
  state.selectedChoiceIds.flatMap((id) => {
    const choice = state.scenario.nodes
      .flatMap((node) => node.kind === "scene" ? node.choices : [])
      .find((candidate) => candidate.id === id);
    if (choice === undefined) return [];
    return [{
      id: choice.id,
      label: choice.label,
      impact: [deltaSummary(state, choice), choice.consequence.text].filter(Boolean).join(" · ")
    }];
  });

function viewFor(state: RuntimeState, stage: TrialPlayerView["stage"], props: ScenarioTrialProps): TrialPlayerView {
  const node = nodeFor(state);
  const choice = lastChoice(state);
  const base = {
    title: state.scenario.title,
    category: props.category,
    introduction: state.scenario.description,
    roleDescription: props.roleDescription,
    stage,
    decisionTrace: decisionTraceFor(state),
    metrics: state.scenario.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      value: state.metrics[metric.id] ?? metric.initialValue,
      displayValue: `${state.metrics[metric.id] ?? metric.initialValue}/100`,
      direction: metric.direction === "lower_is_better" ? "lower-is-better" as const : "higher-is-better" as const
    }))
  };
  if (stage === "briefing") return { ...base, evidence: [] };
  if (node.kind === "scene") {
    const evidence = [
      ...node.evidence.flatMap((item) => citationsFor(state, item.citationIds).map((citation) => ({
        id: `${item.id}-${citation.id}`,
        label: `${item.label} · ${citation.label}`,
        detail: `${item.body} Source: “${citation.quote}”`
      }))),
      ...evidenceFromCitations(state, node.citationIds)
    ];
    return {
      ...base,
      evidence,
      scene: {
        title: node.title,
        situation: node.situation,
        ...(choice ? {
          consequence: [
            choice.consequence.text,
            deltaSummary(state, choice),
            `Decision basis: ${choice.rationale}`
          ].filter(Boolean).join(" ")
        } : {}),
        // Rationale is deliberately withheld until after commitment. Showing it here
        // turns a judgment exercise back into an answer-revealing multiple-choice quiz.
        choices: node.choices.map((item) => ({ id: item.id, label: item.label })),
        evidence
      }
    };
  }
  const result = scoreRun(state.scenario, state);
  const selections = state.selectedChoiceIds.flatMap((id) => {
    const selected = state.scenario.nodes.flatMap((candidate) => candidate.kind === "scene" ? candidate.choices : []).find((candidate) => candidate.id === id);
    return selected === undefined ? [] : [selected.label];
  });
  return {
    ...base,
    evidence: evidenceFromCitations(state, node.citationIds),
    debrief: {
      headline: node.title,
      summary: node.debrief,
      scoreLabel: "Deterministic run score",
      scoreValue: `${result.score}/100 · ${result.outcome ?? "incomplete"}`,
      strengths: selections.length > 0 ? `Actions selected: ${selections.join(" → ")}.` : "No actions were recorded.",
      nextStep: state.scenario.learningObjectives.map((objective) => objective.statement).join(" ")
    }
  };
}

export function ScenarioTrial(props: ScenarioTrialProps) {
  const [runtime, setRuntime] = useState<RuntimeState>(() => createRuntime(props.scenario));
  const [stage, setStage] = useState<TrialPlayerView["stage"]>("briefing");
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState("Briefing ready.");
  const view = useMemo(() => viewFor(runtime, stage, props), [runtime, stage, props]);

  const choose = useCallback((choiceId: string) => {
    try {
      const next = applyChoice(runtime, choiceId);
      const nextNode = nodeFor(next);
      setRuntime(next);
      setStage(nextNode.kind === "terminal" ? "finished" : "playing");
      setError(null);
      setNotification(nextNode.kind === "terminal" ? "Run complete. Your cited debrief is ready." : "State updated. A new decision point is available.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The selected action could not be applied.");
    }
  }, [runtime]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (stage !== "playing" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof HTMLElement && ["BUTTON", "A", "INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
      const index = Number(event.key) - 1;
      const node = nodeFor(runtime);
      if (!Number.isInteger(index) || node.kind !== "scene" || index < 0 || index >= node.choices.length) return;
      const choice = node.choices[index];
      if (choice === undefined) return;
      event.preventDefault();
      choose(choice.id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [choose, runtime, stage]);

  return <TrialPlayer
    disabled={false}
    notification={notification}
    onBegin={() => { setStage("playing"); setNotification("Review the cited evidence and choose an action."); }}
    onChoose={choose}
    onRestart={() => { setRuntime(createRuntime(props.scenario)); setStage("briefing"); setError(null); setNotification("The trial has been reset."); }}
    view={view}
    footer={props.sourceAttribution || error ? <>{props.sourceAttribution}{error ? <p className="player-error" role="alert">{error}</p> : null}</> : undefined}
  />;
}
