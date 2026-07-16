import { incidentResponseFixture } from "@skilltrials/domain";
import { describe, expect, it } from "vitest";
import { safeReturnPath } from "../lib/auth/safe-return";
import { findPrivateSourceDisclosures } from "../lib/trials/private-source-disclosure";
import { sanitizePublicScenario } from "../lib/trials/public-scenario";

describe("authentication return paths", () => {
  it("allows only safe same-origin relative paths", () => {
    expect(safeReturnPath("/dashboard?tab=drafts")).toBe("/dashboard?tab=drafts");
    expect(safeReturnPath("//evil.example")).toBe("/dashboard");
    expect(safeReturnPath("/\\evil.example")).toBe("/dashboard");
    expect(safeReturnPath("https://evil.example")).toBe("/dashboard");
  });
});

describe("private-source publication guard", () => {
  it("finds copied source passages outside citation fields", () => {
    const scenario = structuredClone(incidentResponseFixture);
    const copiedPassage = "Classify an incident as P1 when checkout is unavailable for a material share of customers.";
    const scene = scenario.nodes.find((node) => node.kind === "scene");
    if (scene === undefined || scene.kind !== "scene") throw new Error("Fixture scene is unexpectedly unavailable");
    scene.evidence[0]!.body = `Operator note: ${copiedPassage}`;
    expect(findPrivateSourceDisclosures(scenario, incidentResponseFixture.citations.map((citation) => citation.quote).join(" ")))
      .toContain(`nodes.${scene.id}.evidence.${scene.evidence[0]!.id}.body`);
  });
});

describe("public scenario projection", () => {
  it("does not return verbatim source excerpts to a player", () => {
    const projected = sanitizePublicScenario(incidentResponseFixture);
    expect(projected.citations.every((citation) => citation.quote === "Private source excerpt available to the author.")).toBe(true);
    expect(projected.citations.map((citation) => citation.quote)).not.toContain(incidentResponseFixture.citations[0]?.quote);
  });

  it("keeps citations only when an author explicitly enabled attributed public evidence", () => {
    expect(sanitizePublicScenario(incidentResponseFixture, true).citations[0]?.quote)
      .toBe(incidentResponseFixture.citations[0]?.quote);
  });
});
