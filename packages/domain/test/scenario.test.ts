import { describe, expect, it } from "vitest";
import { applyChoice, createRuntime, incidentResponseFixture, isScenarioPublishable, laboratorySafetyFixture, laboratorySafetySource, scoreRun, validateScenario } from "../src/index.js";

describe("incidentResponseFixture", () => {
  it("is publishable and reaches a successful terminal outcome", () => {
    expect(validateScenario(incidentResponseFixture).valid).toBe(true);
    let state = createRuntime(incidentResponseFixture);
    state = applyChoice(state, "declare-p1");
    state = applyChoice(state, "disable-flag");

    const result = scoreRun(incidentResponseFixture, state);
    expect(result.completed).toBe(true);
    expect(result.outcome).toBe("success");
    expect(result.score).toBeGreaterThan(70);
  });

  it("keeps bad decisions deterministic and prevents actions after completion", () => {
    const state = applyChoice(createRuntime(incidentResponseFixture), "wait-for-more-data");
    expect(scoreRun(incidentResponseFixture, state).outcome).toBe("failure");
    expect(() => applyChoice(state, "declare-p1")).toThrow("already complete");
  });
});

describe("laboratorySafetyFixture", () => {
  it("is a publishable education-first trial with an inspectable public source", () => {
    expect(validateScenario(laboratorySafetyFixture).valid).toBe(true);
    expect(laboratorySafetySource.url).toMatch(/^https:\/\/www\.osha\.gov\//);

    let state = createRuntime(laboratorySafetyFixture);
    state = applyChoice(state, "pause-and-verify");
    state = applyChoice(state, "move-to-functioning-hood");

    expect(scoreRun(laboratorySafetyFixture, state)).toMatchObject({ completed: true, outcome: "success" });
  });

  it("makes an unverified transfer a deterministic failure path", () => {
    const state = applyChoice(createRuntime(laboratorySafetyFixture), "start-anyway");
    expect(scoreRun(laboratorySafetyFixture, state)).toMatchObject({ completed: true, outcome: "failure" });
  });
});

describe("validateScenario", () => {
  it("rejects ungrounded citation references", () => {
    const invalid = structuredClone(incidentResponseFixture);
    invalid.nodes[0]!.citationIds = ["missing-citation"];
    const result = validateScenario(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "unknown_citation")).toBe(true);
    expect(isScenarioPublishable(invalid)).toBe(false);
  });

  it("rejects a reachable scene that cannot terminate", () => {
    const invalid = structuredClone(incidentResponseFixture);
    const start = invalid.nodes.find((node) => node.id === "triage-alert");
    if (start === undefined || start.kind !== "scene") {
      throw new Error("Fixture start node is unexpectedly unavailable");
    }
    start.choices[0]!.nextNodeId = "triage-alert";
    start.choices[1]!.nextNodeId = "triage-alert";
    const result = validateScenario(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "non_terminating_path")).toBe(true);
  });

  it("rejects a reachable cycle even when the cycle has an exit", () => {
    const invalid = structuredClone(incidentResponseFixture);
    const start = invalid.nodes.find((node) => node.id === "triage-alert");
    if (start === undefined || start.kind !== "scene") throw new Error("Fixture start node is unexpectedly unavailable");
    start.choices[0]!.nextNodeId = "triage-alert";
    const result = validateScenario(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "reachable_cycle")).toBe(true);
  });

  it("requires two reachable terminal outcomes", () => {
    const invalid = structuredClone(incidentResponseFixture);
    invalid.nodes.forEach((node) => {
      if (node.kind === "scene") node.choices.forEach((choice) => { choice.nextNodeId = "contained-outage"; });
    });
    const result = validateScenario(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "insufficient_terminal_outcomes")).toBe(true);
  });

  it("caps total verbatim citation disclosure", () => {
    const invalid = structuredClone(incidentResponseFixture);
    invalid.citations = Array.from({ length: 14 }, (_, index) => ({
      ...invalid.citations[0]!,
      id: `citation-${index}`,
      quote: "x".repeat(320)
    }));
    const result = validateScenario(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "citation_quote_budget")).toBe(true);
  });
});
