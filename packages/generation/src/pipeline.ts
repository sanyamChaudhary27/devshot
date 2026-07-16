import { scenarioSchema, type Scenario, type ValidationIssue } from "@skilltrials/domain";
import { z } from "zod";
import { buildRepairInput, buildScenarioInput, buildScenarioInstructions, type GenerationBrief } from "./prompt";
import { validateGrounding } from "./grounding";
import { buildSourceDossier } from "./source";
import { acceptGeneratedScenario } from "./validate";
import { buildVerificationInput, buildVerificationInstructions, verificationIssues, verificationResultSchema } from "./verification";

export type ModelRequest = {
  instructions: string;
  input: string;
  jsonSchema: Readonly<Record<string, unknown>>;
  schemaName?: string;
};

export type GenerationAdapter = {
  generate: (request: ModelRequest) => Promise<unknown>;
  verify: (request: ModelRequest) => Promise<unknown>;
};

export type VerifiedGeneration =
  | { accepted: true; scenario: Scenario; attempts: 1 | 2; issues: readonly [] }
  | { accepted: false; scenario: null; attempts: 1 | 2; issues: readonly ValidationIssue[] };

export const scenarioJsonSchema = z.toJSONSchema(scenarioSchema) as Readonly<Record<string, unknown>>;

const validateCandidate = async (candidate: unknown, source: ReturnType<typeof buildSourceDossier>, adapter: GenerationAdapter) => {
  const accepted = acceptGeneratedScenario(candidate);
  if (!accepted.accepted) return accepted;
  const groundingIssues = validateGrounding(accepted.scenario, source);
  if (groundingIssues.length > 0) return { accepted: false as const, scenario: null, issues: groundingIssues };
  const semanticIssues = verificationIssues(await adapter.verify({
    instructions: buildVerificationInstructions(),
    input: buildVerificationInput(source, accepted.scenario),
    jsonSchema: z.toJSONSchema(verificationResultSchema) as Readonly<Record<string, unknown>>,
    schemaName: "skilltrials_grounding_verification"
  }));
  return semanticIssues.length === 0
    ? accepted
    : { accepted: false as const, scenario: null, issues: semanticIssues };
};

const issueMessages = (issues: readonly ValidationIssue[]): readonly string[] =>
  issues.map((item) => `${item.path.join(".") || "scenario"}: ${item.message}`);

/** Uses at most four model requests: draft + semantic review, then one repair + review. */
export const generateVerifiedScenario = async (
  request: { sourceId: string; sourceTitle: string; sourceText: string; brief: GenerationBrief },
  adapter: GenerationAdapter
): Promise<VerifiedGeneration> => {
  const source = buildSourceDossier({
    sourceId: request.sourceId,
    title: request.sourceTitle,
    text: request.sourceText
  });
  const instructions = buildScenarioInstructions();
  const firstCandidate = await adapter.generate({
    instructions,
    input: buildScenarioInput(source, request.brief),
    jsonSchema: scenarioJsonSchema
  });
  const firstResult = await validateCandidate(firstCandidate, source, adapter);
  if (firstResult.accepted) return { ...firstResult, attempts: 1 };

  const repairedCandidate = await adapter.generate({
    instructions,
    input: buildRepairInput(source, request.brief, firstCandidate, issueMessages(firstResult.issues)),
    jsonSchema: scenarioJsonSchema
  });
  const repairedResult = await validateCandidate(repairedCandidate, source, adapter);
  return repairedResult.accepted
    ? { ...repairedResult, attempts: 2 }
    : { accepted: false, scenario: null, attempts: 2, issues: repairedResult.issues };
};
