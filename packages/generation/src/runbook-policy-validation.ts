import { releasePolicySchema, type ReleasePolicy, type ValidationIssue } from "@skilltrials/domain";
import type { SourceDossier } from "./source";

export type ReleasePolicyAcceptance =
  | { accepted: true; policy: ReleasePolicy; issues: readonly [] }
  | { accepted: false; policy: null; issues: readonly ValidationIssue[] };

const issue = (code: string, message: string, path: readonly (string | number)[]): ValidationIssue => ({ code, message, path });

const duplicateIds = (ids: readonly string[]): readonly string[] =>
  [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

export const validateReleasePolicyStructure = (policy: ReleasePolicy): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  duplicateIds(policy.citations.map((citation) => citation.id)).forEach((id) => {
    issues.push(issue("duplicate_citation", `Citation id \"${id}\" is duplicated`, ["citations"]));
  });
  duplicateIds(policy.controls.map((control) => control.id)).forEach((id) => {
    issues.push(issue("duplicate_control", `Control id \"${id}\" is duplicated`, ["controls"]));
  });
  const citationIds = new Set(policy.citations.map((citation) => citation.id));
  policy.controls.forEach((control, controlIndex) => {
    control.citationIds.forEach((citationId, citationIndex) => {
      if (!citationIds.has(citationId)) {
        issues.push(issue("unknown_citation", `Control \"${control.id}\" references an unknown citation`, ["controls", controlIndex, "citationIds", citationIndex]));
      }
    });
  });
  return issues;
};

export const validateReleasePolicyIdentity = (
  policy: ReleasePolicy,
  expected: { policyId: string; policyTitle: string; version: number }
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (policy.id !== expected.policyId) {
    issues.push(issue("policy_identity", "Policy id does not match the requested policy id", ["id"]));
  }
  if (policy.title !== expected.policyTitle) {
    issues.push(issue("policy_identity", "Policy title does not match the requested policy title", ["title"]));
  }
  if (policy.version !== expected.version) {
    issues.push(issue("policy_identity", "Policy version does not match the requested policy version", ["version"]));
  }
  return issues;
};

/** Confirms that every policy citation is an exact, bounded excerpt of the normalized runbook. */
export const validateReleasePolicyGrounding = (policy: ReleasePolicy, dossier: SourceDossier): readonly ValidationIssue[] =>
  policy.citations.flatMap((citation, index) => {
    const span = citation.sourceSpan;
    if (span.sourceId !== dossier.sourceId) {
      return [issue("ungrounded_citation", `Citation \"${citation.id}\" points to a different source`, ["citations", index, "sourceSpan", "sourceId"])];
    }
    if (span.endOffset > dossier.normalizedText.length) {
      return [issue("ungrounded_citation", `Citation \"${citation.id}\" extends beyond the source text`, ["citations", index, "sourceSpan", "endOffset"])];
    }
    const excerpt = dossier.normalizedText.slice(span.startOffset, span.endOffset);
    return excerpt === citation.quote
      ? []
      : [issue("ungrounded_citation", `Citation \"${citation.id}\" is not an exact source excerpt`, ["citations", index])];
  });

export const acceptGeneratedReleasePolicy = (candidate: unknown, dossier: SourceDossier): ReleasePolicyAcceptance => {
  const parsed = releasePolicySchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      accepted: false,
      policy: null,
      issues: parsed.error.issues.map((schemaIssue) => issue(
        "schema",
        schemaIssue.message,
        schemaIssue.path.map((part) => typeof part === "number" ? part : String(part))
      ))
    };
  }
  const issues = [...validateReleasePolicyStructure(parsed.data), ...validateReleasePolicyGrounding(parsed.data, dossier)];
  return issues.length === 0
    ? { accepted: true, policy: parsed.data, issues: [] }
    : { accepted: false, policy: null, issues };
};
