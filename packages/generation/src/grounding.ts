import type { Scenario, ValidationIssue } from "@skilltrials/domain";
import type { SourceDossier } from "./source";

const issue = (message: string, path: readonly (string | number)[]): ValidationIssue => ({
  code: "ungrounded_citation",
  message,
  path
});

/** Confirms that every rendered quote is an exact, bounded excerpt of this source. */
export const validateGrounding = (scenario: Scenario, dossier: SourceDossier): readonly ValidationIssue[] =>
  scenario.citations.flatMap((citation, index) => {
    const { sourceSpan } = citation;
    if (sourceSpan.sourceId !== dossier.sourceId) {
      return [issue(`Citation \"${citation.id}\" points to a different source`, ["citations", index, "sourceSpan", "sourceId"])];
    }
    if (sourceSpan.endOffset > dossier.normalizedText.length) {
      return [issue(`Citation \"${citation.id}\" extends beyond the source text`, ["citations", index, "sourceSpan", "endOffset"])];
    }
    const excerpt = dossier.normalizedText.slice(sourceSpan.startOffset, sourceSpan.endOffset);
    return excerpt === citation.quote
      ? []
      : [issue(`Citation \"${citation.id}\" is not an exact source excerpt`, ["citations", index])];
  });
