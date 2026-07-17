import { migrationRunbookFixture, type ReleasePolicy } from "@skilltrials/domain";
import { describe, expect, it } from "vitest";
import {
  acceptGeneratedReleasePolicy,
  buildRunbookPolicyInput,
  buildRunbookPolicyInstructions,
  buildSourceDossier,
  generateVerifiedReleasePolicy,
  runbookChangeContextSchema
} from "../src/index.js";

const sourceId = "c3c9c4c8-5c1c-4aa7-9d08-22c00c1d2f4f";
const sourceText = migrationRunbookFixture.citations.map((citation) => citation.quote).join("\n\n");

const groundedPolicy = (): ReleasePolicy => ({
  ...migrationRunbookFixture,
  citations: migrationRunbookFixture.citations.map((citation) => {
    const startOffset = sourceText.indexOf(citation.quote);
    if (startOffset < 0) throw new Error("Fixture citation is missing from the source text");
    return {
      ...citation,
      sourceSpan: { sourceId, startOffset, endOffset: startOffset + citation.quote.length }
    };
  })
});

describe("Runbook Firewall policy compiler", () => {
  it("grounds each compiled citation against the normalized runbook", () => {
    const dossier = buildSourceDossier({ sourceId, title: "Payments migration runbook", text: sourceText });
    expect(acceptGeneratedReleasePolicy(groundedPolicy(), dossier).accepted).toBe(true);

    const ungrounded = groundedPolicy();
    const firstCitation = ungrounded.citations[0];
    if (firstCitation === undefined) throw new Error("Expected fixture citation");
    ungrounded.citations[0] = { ...firstCitation, quote: "A fabricated requirement." };
    expect(acceptGeneratedReleasePolicy(ungrounded, dossier).accepted).toBe(false);
  });

  it("keeps an optional change context separate from the runbook authority", () => {
    const dossier = buildSourceDossier({ sourceId, title: "Payments migration runbook", text: sourceText });
    const context = {
      service: "payments-api",
      environment: "production" as const,
      changeSummary: "Remove a legacy invoice-status column.",
      proposedCommand: "pnpm prisma migrate deploy --environment production"
    };
    const input = buildRunbookPolicyInput(dossier, {
      policyId: "payments-policy-v2",
      policyTitle: "Payments migration safeguards",
      version: 2,
      changeContext: context
    });

    expect(runbookChangeContextSchema.safeParse(context).success).toBe(true);
    expect(buildRunbookPolicyInstructions()).toContain("sole authority");
    expect(input).toContain("Remove a legacy invoice-status column.");
  });

  it("repairs one structurally ungrounded policy draft without a network call", async () => {
    const invalidDraft = groundedPolicy();
    const firstCitation = invalidDraft.citations[0];
    if (firstCitation === undefined) throw new Error("Expected fixture citation");
    invalidDraft.citations[0] = {
      ...firstCitation,
      sourceSpan: { ...firstCitation.sourceSpan, sourceId: "another-runbook" }
    };
    let generated = 0;
    let verified = 0;

    const result = await generateVerifiedReleasePolicy({
      sourceId,
      sourceTitle: "Payments migration runbook",
      sourceText,
      brief: { policyId: migrationRunbookFixture.id, policyTitle: migrationRunbookFixture.title, version: migrationRunbookFixture.version }
    }, {
      generate: async () => {
        generated += 1;
        return generated === 1 ? invalidDraft : groundedPolicy();
      },
      verify: async () => {
        verified += 1;
        return { verdict: "supported", findings: [] };
      }
    });

    expect(result.accepted).toBe(true);
    expect(result.attempts).toBe(2);
    expect(generated).toBe(2);
    expect(verified).toBe(1);
  });

  it("repairs once when the semantic verifier rejects an otherwise grounded policy", async () => {
    let generated = 0;
    let verified = 0;
    const result = await generateVerifiedReleasePolicy({
      sourceId,
      sourceTitle: "Payments migration runbook",
      sourceText,
      brief: { policyId: migrationRunbookFixture.id, policyTitle: migrationRunbookFixture.title, version: migrationRunbookFixture.version }
    }, {
      generate: async () => {
        generated += 1;
        return groundedPolicy();
      },
      verify: async () => {
        verified += 1;
        return verified === 1
          ? { verdict: "unsupported", findings: [{ path: "controls.0.requirement", explanation: "Requirement overstates the cited source." }] }
          : { verdict: "supported", findings: [] };
      }
    });

    expect(result.accepted).toBe(true);
    expect(result.attempts).toBe(2);
    expect(generated).toBe(2);
    expect(verified).toBe(2);
  });
});
