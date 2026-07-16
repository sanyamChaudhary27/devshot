import { scenarioSchema, validateScenario, type Scenario, type ValidationIssue } from "@skilltrials/domain";

export type GenerationAcceptance =
  | { accepted: true; scenario: Scenario; issues: readonly [] }
  | { accepted: false; scenario: null; issues: readonly ValidationIssue[] };

export const acceptGeneratedScenario = (candidate: unknown): GenerationAcceptance => {
  const parsed = scenarioSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      accepted: false,
      scenario: null,
      issues: parsed.error.issues.map((issue) => ({
        code: "schema",
        message: issue.message,
        path: issue.path.map((part) => typeof part === "number" ? part : String(part))
      }))
    };
  }

  const validation = validateScenario(parsed.data);
  return validation.valid
    ? { accepted: true, scenario: validation.scenario, issues: [] }
    : { accepted: false, scenario: null, issues: validation.issues };
};
