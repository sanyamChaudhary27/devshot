import type { Scenario } from "@skilltrials/domain";

/** Redacts excerpts unless the author explicitly recorded permission to share evidence publicly. */
export const sanitizePublicScenario = (scenario: Scenario, allowPublicEvidence = false): Scenario => allowPublicEvidence ? scenario : ({
  ...scenario,
  citations: scenario.citations.map((citation) => ({
    ...citation,
    quote: "Private source excerpt available to the author."
  }))
});
