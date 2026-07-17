import { releasePolicySchema, type ReleasePolicy, type ValidationIssue } from "@skilltrials/domain";
import { z } from "zod";
import { buildSourceDossier } from "./source";
import {
  buildRunbookPolicyInput,
  buildRunbookPolicyInstructions,
  buildRunbookPolicyRepairInput,
  type RunbookPolicyBrief
} from "./runbook-policy-prompt";
import { acceptGeneratedReleasePolicy, validateReleasePolicyIdentity } from "./runbook-policy-validation";
import {
  buildReleasePolicyVerificationInput,
  buildReleasePolicyVerificationInstructions,
  releasePolicyVerificationIssues,
  releasePolicyVerificationResultSchema
} from "./runbook-policy-verification";
import type { ModelRequest } from "./pipeline";

export type ReleasePolicyGenerationAdapter = {
  generate: (request: ModelRequest) => Promise<unknown>;
  verify: (request: ModelRequest) => Promise<unknown>;
};

export type VerifiedReleasePolicyGeneration =
  | { accepted: true; policy: ReleasePolicy; attempts: 1 | 2; issues: readonly [] }
  | { accepted: false; policy: null; attempts: 1 | 2; issues: readonly ValidationIssue[] };

export const releasePolicyJsonSchema = z.toJSONSchema(releasePolicySchema) as Readonly<Record<string, unknown>>;

const issueMessages = (issues: readonly ValidationIssue[]): readonly string[] =>
  issues.map((item) => `${item.path.join(".") || "policy"}: ${item.message}`);

const validateCandidate = async (
  candidate: unknown,
  source: ReturnType<typeof buildSourceDossier>,
  adapter: ReleasePolicyGenerationAdapter,
  brief: RunbookPolicyBrief
) => {
  const accepted = acceptGeneratedReleasePolicy(candidate, source);
  if (!accepted.accepted) return accepted;
  const identityIssues = validateReleasePolicyIdentity(accepted.policy, brief);
  if (identityIssues.length > 0) return { accepted: false as const, policy: null, issues: identityIssues };
  const semanticIssues = releasePolicyVerificationIssues(await adapter.verify({
    instructions: buildReleasePolicyVerificationInstructions(),
    input: buildReleasePolicyVerificationInput(source, accepted.policy),
    jsonSchema: z.toJSONSchema(releasePolicyVerificationResultSchema) as Readonly<Record<string, unknown>>,
    schemaName: "runbook_firewall_policy_verification"
  }));
  return semanticIssues.length === 0
    ? accepted
    : { accepted: false as const, policy: null, issues: semanticIssues };
};

/** Uses at most four model requests: policy draft + verification, then one repair + verification. */
export const generateVerifiedReleasePolicy = async (
  request: { sourceId: string; sourceTitle: string; sourceText: string; brief: RunbookPolicyBrief },
  adapter: ReleasePolicyGenerationAdapter
): Promise<VerifiedReleasePolicyGeneration> => {
  const source = buildSourceDossier({ sourceId: request.sourceId, title: request.sourceTitle, text: request.sourceText });
  const firstCandidate = await adapter.generate({
    instructions: buildRunbookPolicyInstructions(),
    input: buildRunbookPolicyInput(source, request.brief),
    jsonSchema: releasePolicyJsonSchema,
    schemaName: "runbook_firewall_release_policy"
  });
  const firstResult = await validateCandidate(firstCandidate, source, adapter, request.brief);
  if (firstResult.accepted) return { ...firstResult, attempts: 1 };

  const repairedCandidate = await adapter.generate({
    instructions: buildRunbookPolicyInstructions(),
    input: buildRunbookPolicyRepairInput(source, request.brief, firstCandidate, issueMessages(firstResult.issues)),
    jsonSchema: releasePolicyJsonSchema,
    schemaName: "runbook_firewall_release_policy"
  });
  const repairedResult = await validateCandidate(repairedCandidate, source, adapter, request.brief);
  return repairedResult.accepted
    ? { ...repairedResult, attempts: 2 }
    : { accepted: false, policy: null, attempts: 2, issues: repairedResult.issues };
};
