import type { Choice, Scenario, SceneNode, TerminalNode } from "./scenario";

export type RuntimeState = {
  scenario: Scenario;
  currentNodeId: string;
  metrics: Record<string, number>;
  flags: Record<string, boolean>;
  selectedChoiceIds: readonly string[];
  terminalNodeId: string | null;
};

export type ScoredRun = {
  score: number;
  outcome: TerminalNode["outcome"] | null;
  completed: boolean;
  metricValues: Readonly<Record<string, number>>;
  selectedChoiceIds: readonly string[];
};

const clampMetric = (value: number): number => Math.min(100, Math.max(0, value));

const findNode = (scenario: Scenario, nodeId: string): Scenario["nodes"][number] => {
  const node = scenario.nodes.find((candidate) => candidate.id === nodeId);
  if (node === undefined) {
    throw new Error(`Unknown scenario node: ${nodeId}`);
  }
  return node;
};

const findChoice = (node: SceneNode, choiceId: string): Choice => {
  const choice = node.choices.find((candidate) => candidate.id === choiceId);
  if (choice === undefined) {
    throw new Error(`Choice ${choiceId} is not available at node ${node.id}`);
  }
  return choice;
};

export const createRuntime = (scenario: Scenario): RuntimeState => ({
  scenario,
  currentNodeId: scenario.startNodeId,
  metrics: Object.fromEntries(scenario.metrics.map((metric) => [metric.id, metric.initialValue])),
  flags: {},
  selectedChoiceIds: [],
  terminalNodeId: null
});

export const applyChoice = (state: RuntimeState, choiceId: string): RuntimeState => {
  const { scenario } = state;
  if (state.terminalNodeId !== null) {
    throw new Error("The trial is already complete");
  }

  const currentNode = findNode(scenario, state.currentNodeId);
  if (currentNode.kind !== "scene") {
    throw new Error("The current node does not accept choices");
  }

  const choice = findChoice(currentNode, choiceId);
  const nextNode = findNode(scenario, choice.nextNodeId);
  const nextMetrics: Record<string, number> = { ...state.metrics };

  for (const [metricId, delta] of Object.entries(choice.metricDeltas)) {
    const currentValue = nextMetrics[metricId];
    if (currentValue === undefined) {
      throw new Error(`Choice ${choice.id} references an unknown metric: ${metricId}`);
    }
    nextMetrics[metricId] = clampMetric(currentValue + delta);
  }

  return {
    scenario,
    currentNodeId: nextNode.id,
    metrics: nextMetrics,
    flags: { ...state.flags, ...choice.setFlags },
    selectedChoiceIds: [...state.selectedChoiceIds, choice.id],
    terminalNodeId: nextNode.kind === "terminal" ? nextNode.id : null
  };
};

export const scoreRun = (scenario: Scenario, state: RuntimeState): ScoredRun => {
  const averageMetric = scenario.metrics.reduce(
    (total, metric) => total + (state.metrics[metric.id] ?? metric.initialValue),
    0
  ) / scenario.metrics.length;
  const terminal = state.terminalNodeId === null ? null : findNode(scenario, state.terminalNodeId);
  const outcome = terminal?.kind === "terminal" ? terminal.outcome : null;
  const outcomeAdjustment = outcome === "success" ? 10 : outcome === "failure" ? -10 : 0;

  return {
    score: Math.round(clampMetric(averageMetric + outcomeAdjustment)),
    outcome,
    completed: outcome !== null,
    metricValues: { ...state.metrics },
    selectedChoiceIds: [...state.selectedChoiceIds]
  };
};
