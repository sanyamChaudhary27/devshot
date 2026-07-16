import type { Scenario } from "@skilltrials/domain";

const minimumVerbatimDisclosureLength = 28;
const normalize = (value: string): string => value.replace(/\s+/g, " ").trim().toLocaleLowerCase();

const publicTextFields = (scenario: Scenario): readonly { path: string; value: string }[] => [
  { path: "title", value: scenario.title },
  { path: "description", value: scenario.description },
  ...scenario.learningObjectives.map((objective) => ({ path: `learningObjectives.${objective.id}`, value: objective.statement })),
  ...scenario.metrics.flatMap((metric) => [
    { path: `metrics.${metric.id}.label`, value: metric.label },
    { path: `metrics.${metric.id}.description`, value: metric.description }
  ]),
  ...scenario.nodes.flatMap((node) => node.kind === "terminal"
    ? [{ path: `nodes.${node.id}.title`, value: node.title }, { path: `nodes.${node.id}.debrief`, value: node.debrief }]
    : [
        { path: `nodes.${node.id}.title`, value: node.title },
        { path: `nodes.${node.id}.situation`, value: node.situation },
        ...node.evidence.flatMap((evidence) => [
          { path: `nodes.${node.id}.evidence.${evidence.id}.label`, value: evidence.label },
          { path: `nodes.${node.id}.evidence.${evidence.id}.body`, value: evidence.body }
        ]),
        ...node.choices.flatMap((choice) => [
          { path: `nodes.${node.id}.choices.${choice.id}.label`, value: choice.label },
          { path: `nodes.${node.id}.choices.${choice.id}.rationale`, value: choice.rationale },
          { path: `nodes.${node.id}.choices.${choice.id}.consequence`, value: choice.consequence.text }
        ])
      ])
];

/** Finds copied source passages in text that would be visible on a public share. */
export const findPrivateSourceDisclosures = (scenario: Scenario, sourceText: string): readonly string[] => {
  const normalizedSource = normalize(sourceText);
  if (normalizedSource.length < minimumVerbatimDisclosureLength) return [];
  const sourceWindows = new Set<string>();
  for (let index = 0; index <= normalizedSource.length - minimumVerbatimDisclosureLength; index += 1) {
    sourceWindows.add(normalizedSource.slice(index, index + minimumVerbatimDisclosureLength));
  }

  return publicTextFields(scenario).flatMap(({ path, value }) => {
    const normalizedValue = normalize(value);
    for (let index = 0; index <= normalizedValue.length - minimumVerbatimDisclosureLength; index += 1) {
      if (sourceWindows.has(normalizedValue.slice(index, index + minimumVerbatimDisclosureLength))) return [path];
    }
    return [];
  });
};
