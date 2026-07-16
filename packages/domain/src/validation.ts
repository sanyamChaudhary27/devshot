import { type Choice, type Scenario, scenarioSchema } from "./scenario";

export type ValidationIssue = {
  code: string;
  message: string;
  path: readonly (string | number)[];
};

export type ScenarioValidation =
  | { valid: true; scenario: Scenario; issues: readonly [] }
  | { valid: false; scenario: null; issues: readonly ValidationIssue[] };

const addIssue = (issues: ValidationIssue[], code: string, message: string, path: readonly (string | number)[]): void => {
  issues.push({ code, message, path });
};

const checkUniqueIds = (
  issues: ValidationIssue[],
  label: string,
  values: readonly { id: string }[],
  path: readonly (string | number)[]
): void => {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value.id)) {
      addIssue(issues, "duplicate_id", `${label} id \"${value.id}\" is duplicated`, [...path, index, "id"]);
    }
    seen.add(value.id);
  });
};

const checkCitationIds = (
  issues: ValidationIssue[],
  knownCitationIds: ReadonlySet<string>,
  values: readonly string[],
  path: readonly (string | number)[]
): void => {
  values.forEach((citationId, index) => {
    if (!knownCitationIds.has(citationId)) {
      addIssue(issues, "unknown_citation", `Citation \"${citationId}\" does not exist`, [...path, index]);
    }
  });
};

const choiceFingerprint = (choice: Choice): string =>
  JSON.stringify({ nextNodeId: choice.nextNodeId, metricDeltas: choice.metricDeltas, setFlags: choice.setFlags });

const toValidationPath = (path: readonly PropertyKey[]): readonly (string | number)[] =>
  path.map((segment) => (typeof segment === "number" ? segment : String(segment)));

const reachableFromStart = (scenario: Scenario, nodesById: ReadonlyMap<string, Scenario["nodes"][number]>): Set<string> => {
  const visited = new Set<string>();
  const pending = [scenario.startNodeId];
  while (pending.length > 0) {
    const nodeId = pending.pop();
    if (nodeId === undefined || visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);
    const node = nodesById.get(nodeId);
    if (node?.kind === "scene") {
      node.choices.forEach((choice) => pending.push(choice.nextNodeId));
    }
  }
  return visited;
};

const nodesThatCanReachTerminal = (scenario: Scenario): Set<string> => {
  const parents = new Map<string, string[]>();
  const terminalIds = new Set<string>();
  scenario.nodes.forEach((node) => {
    if (node.kind === "terminal") {
      terminalIds.add(node.id);
      return;
    }
    node.choices.forEach((choice) => {
      const currentParents = parents.get(choice.nextNodeId) ?? [];
      currentParents.push(node.id);
      parents.set(choice.nextNodeId, currentParents);
    });
  });
  const reachable = new Set<string>(terminalIds);
  const pending = [...terminalIds];
  while (pending.length > 0) {
    const nodeId = pending.pop();
    if (nodeId === undefined) {
      continue;
    }
    for (const parentId of parents.get(nodeId) ?? []) {
      if (!reachable.has(parentId)) {
        reachable.add(parentId);
        pending.push(parentId);
      }
    }
  }
  return reachable;
};

const hasReachableCycle = (scenario: Scenario, nodesById: ReadonlyMap<string, Scenario["nodes"][number]>, reachable: ReadonlySet<string>): boolean => {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    visiting.add(nodeId);
    const node = nodesById.get(nodeId);
    const cycle = node?.kind === "scene" && node.choices.some((choice) => reachable.has(choice.nextNodeId) && visit(choice.nextNodeId));
    visiting.delete(nodeId);
    return cycle;
  };
  return visit(scenario.startNodeId);
};

export const validateScenario = (input: unknown): ScenarioValidation => {
  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      scenario: null,
      issues: parsed.error.issues.map((issue) => ({
        code: "schema",
        message: issue.message,
        path: toValidationPath(issue.path)
      }))
    };
  }

  const scenario = parsed.data;
  const issues: ValidationIssue[] = [];
  const totalCitationQuoteCharacters = scenario.citations.reduce((total, citation) => total + citation.quote.length, 0);
  if (totalCitationQuoteCharacters > 4_000) {
    addIssue(issues, "citation_quote_budget", "Citation quotes exceed the 4,000-character disclosure budget", ["citations"]);
  }
  const citationIds = new Set(scenario.citations.map((citation) => citation.id));
  const metricIds = new Set(scenario.metrics.map((metric) => metric.id));
  const nodesById = new Map(scenario.nodes.map((node) => [node.id, node]));

  checkUniqueIds(issues, "citation", scenario.citations, ["citations"]);
  checkUniqueIds(issues, "learning objective", scenario.learningObjectives, ["learningObjectives"]);
  checkUniqueIds(issues, "metric", scenario.metrics, ["metrics"]);
  checkUniqueIds(issues, "node", scenario.nodes, ["nodes"]);

  scenario.learningObjectives.forEach((objective, index) => {
    checkCitationIds(issues, citationIds, objective.citationIds, ["learningObjectives", index, "citationIds"]);
  });

  if (!nodesById.has(scenario.startNodeId)) {
    addIssue(issues, "unknown_start_node", `Start node \"${scenario.startNodeId}\" does not exist`, ["startNodeId"]);
  }

  scenario.nodes.forEach((node, nodeIndex) => {
    checkCitationIds(issues, citationIds, node.citationIds, ["nodes", nodeIndex, "citationIds"]);
    if (node.kind === "terminal") {
      return;
    }

    checkUniqueIds(issues, `evidence in node ${node.id}`, node.evidence, ["nodes", nodeIndex, "evidence"]);
    checkUniqueIds(issues, `choice in node ${node.id}`, node.choices, ["nodes", nodeIndex, "choices"]);
    const fingerprints = new Set<string>();
    node.evidence.forEach((evidence, evidenceIndex) => {
      checkCitationIds(issues, citationIds, evidence.citationIds, ["nodes", nodeIndex, "evidence", evidenceIndex, "citationIds"]);
    });
    node.choices.forEach((choice, choiceIndex) => {
      checkCitationIds(issues, citationIds, choice.citationIds, ["nodes", nodeIndex, "choices", choiceIndex, "citationIds"]);
      checkCitationIds(issues, citationIds, choice.consequence.citationIds, ["nodes", nodeIndex, "choices", choiceIndex, "consequence", "citationIds"]);
      if (!nodesById.has(choice.nextNodeId)) {
        addIssue(issues, "unknown_next_node", `Choice \"${choice.id}\" points to a missing node`, ["nodes", nodeIndex, "choices", choiceIndex, "nextNodeId"]);
      }
      Object.keys(choice.metricDeltas).forEach((metricId) => {
        if (!metricIds.has(metricId)) {
          addIssue(issues, "unknown_metric", `Choice \"${choice.id}\" changes an unknown metric`, ["nodes", nodeIndex, "choices", choiceIndex, "metricDeltas", metricId]);
        }
      });
      const fingerprint = choiceFingerprint(choice);
      if (fingerprints.has(fingerprint)) {
        addIssue(issues, "immaterial_choice", `Choice \"${choice.id}\" has the same state transition as another choice`, ["nodes", nodeIndex, "choices", choiceIndex]);
      }
      fingerprints.add(fingerprint);
    });
  });

  const startNode = nodesById.get(scenario.startNodeId);
  if (startNode?.kind === "terminal") {
    addIssue(issues, "terminal_start", "The trial must start with a playable scene", ["startNodeId"]);
  }

  const reachable = reachableFromStart(scenario, nodesById);
  scenario.nodes.forEach((node, index) => {
    if (!reachable.has(node.id)) {
      addIssue(issues, "unreachable_node", `Node \"${node.id}\" is unreachable from the start node`, ["nodes", index]);
    }
  });

  const terminalReachable = nodesThatCanReachTerminal(scenario);
  scenario.nodes.forEach((node, index) => {
    if (reachable.has(node.id) && !terminalReachable.has(node.id)) {
      addIssue(issues, "non_terminating_path", `Node \"${node.id}\" cannot reach a terminal outcome`, ["nodes", index]);
    }
  });

  const reachableTerminalCount = scenario.nodes.filter((node) => node.kind === "terminal" && reachable.has(node.id)).length;
  if (reachableTerminalCount < 2) {
    addIssue(issues, "insufficient_terminal_outcomes", "A trial needs at least two reachable terminal outcomes", ["nodes"]);
  }
  if (hasReachableCycle(scenario, nodesById, reachable)) {
    addIssue(issues, "reachable_cycle", "Reachable cycles are not allowed because every choice path must terminate", ["nodes"]);
  }
  if (JSON.stringify(scenario).length > 60_000) {
    addIssue(issues, "scenario_size_budget", "Scenario document exceeds the 60,000-character budget", []);
  }

  return issues.length === 0
    ? { valid: true, scenario, issues: [] }
    : { valid: false, scenario: null, issues };
};

export const isScenarioPublishable = (input: unknown): input is Scenario => validateScenario(input).valid;
