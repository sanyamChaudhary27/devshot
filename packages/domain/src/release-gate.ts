import { z } from "zod";
import { citationSchema, type Citation } from "./scenario";

const id = z.string().trim().min(1).max(96);
const label = z.string().trim().min(1).max(160);
const detail = z.string().trim().min(1).max(2_000);

export const controlTypeSchema = z.enum([
  "maintenance_window",
  "approval",
  "backup",
  "rollback_plan",
  "service_impact_acknowledged"
]);

export const controlSeveritySchema = z.enum(["blocking", "warning"]);
export const evidenceProvenanceSchema = z.enum(["operator_attested", "integration_verified", "demo_fixture"]);
export const riskLevelSchema = z.enum(["low", "medium", "high"]);

export const runbookControlSchema = z.object({
  id,
  label,
  requirement: detail,
  type: controlTypeSchema,
  severity: controlSeveritySchema,
  citationIds: z.array(id).min(1).max(8)
}).strict();

export const releasePolicySchema = z.object({
  id,
  version: z.number().int().positive(),
  title: label,
  citations: z.array(citationSchema).min(1).max(32),
  controls: z.array(runbookControlSchema).min(1).max(24)
}).strict();

export const proposedReleaseSchema = z.object({
  id,
  command: detail,
  environment: z.enum(["development", "staging", "production"]),
  service: label,
  migrationSummary: z.string().trim().max(1_000).optional(),
  migrationSql: z.string().trim().max(12_000).optional()
}).strict();

export const evidenceRecordSchema = z.object({
  id,
  controlId: id,
  value: detail,
  provenance: evidenceProvenanceSchema,
  capturedAt: z.string().datetime(),
  status: z.enum(["valid", "invalid"])
}).strict();

export type ControlType = z.infer<typeof controlTypeSchema>;
export type ControlSeverity = z.infer<typeof controlSeveritySchema>;
export type EvidenceProvenance = z.infer<typeof evidenceProvenanceSchema>;
export type RunbookControl = z.infer<typeof runbookControlSchema>;
export type ReleasePolicy = z.infer<typeof releasePolicySchema>;
export type ProposedRelease = z.infer<typeof proposedReleaseSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;

export type RiskSignal = {
  id: string;
  label: string;
  level: z.infer<typeof riskLevelSchema>;
  detail: string;
};

export type GateControlResult = {
  control: RunbookControl;
  status: "satisfied" | "missing" | "invalid";
  evidence?: EvidenceRecord;
  reason: string;
};

export type ReleaseGateResult = {
  status: "BLOCKED" | "ELIGIBLE";
  riskSignals: readonly RiskSignal[];
  controls: readonly GateControlResult[];
};

export type ReleaseReceipt = {
  schemaVersion: 1;
  releaseId: string;
  policyId: string;
  policyVersion: number;
  verdict: ReleaseGateResult["status"];
  createdAt: string;
  command: string;
  environment: ProposedRelease["environment"];
  service: string;
  riskSignals: readonly RiskSignal[];
  controls: readonly {
    controlId: string;
    status: GateControlResult["status"];
    citationIds: readonly string[];
    evidenceId?: string;
    evidenceProvenance?: EvidenceProvenance;
  }[];
  fingerprint: string;
};

const hasToken = (text: string, expression: RegExp): boolean => expression.test(text);

export const analyzeReleaseRisk = (release: ProposedRelease): readonly RiskSignal[] => {
  const inspected = `${release.command}\n${release.migrationSummary ?? ""}\n${release.migrationSql ?? ""}`.toLowerCase();
  const signals: RiskSignal[] = [];
  if (release.environment === "production") {
    signals.push({ id: "production-target", label: "Production target", level: "high", detail: "The proposed command targets production." });
  }
  if (hasToken(inspected, /\bdrop\s+(table|column|database|schema)\b/)) {
    signals.push({ id: "destructive-schema", label: "Destructive schema change", level: "high", detail: "The change contains a DROP operation that may be irreversible without a tested rollback." });
  }
  if (hasToken(inspected, /\b(delete\s+from|truncate\s+(table\s+)?\w+)\b/)) {
    signals.push({ id: "destructive-data", label: "Destructive data operation", level: "high", detail: "The change contains a DELETE or TRUNCATE operation." });
  }
  if (hasToken(inspected, /\balter\s+table\b/) && !hasToken(inspected, /\bif\s+exists\b/)) {
    signals.push({ id: "schema-mutation", label: "Schema mutation", level: "medium", detail: "The change mutates a database schema and requires an explicit recovery plan." });
  }
  if (release.environment === "production" && !hasToken(inspected, /--dry-run|--plan|--check/)) {
    signals.push({ id: "no-dry-run", label: "No dry-run signal", level: "medium", detail: "No dry-run, plan, or check flag was found in the proposed command." });
  }
  return signals;
};

const matchingEvidence = (control: RunbookControl, evidence: readonly EvidenceRecord[]): EvidenceRecord | undefined =>
  evidence.find((record) => record.controlId === control.id && record.status === "valid");

export const evaluateReleaseGate = (
  policy: ReleasePolicy,
  release: ProposedRelease,
  evidence: readonly EvidenceRecord[]
): ReleaseGateResult => {
  const riskSignals = analyzeReleaseRisk(release);
  const controls = policy.controls.map((control): GateControlResult => {
    const record = matchingEvidence(control, evidence);
    if (record !== undefined) {
      return { control, status: "satisfied", evidence: record, reason: `Evidence is present as ${record.provenance.replaceAll("_", " ")}.` };
    }
    const invalidRecord = evidence.find((candidate) => candidate.controlId === control.id && candidate.status === "invalid");
    if (invalidRecord !== undefined) {
      return { control, status: "invalid", evidence: invalidRecord, reason: "Submitted evidence is marked invalid and cannot satisfy this control." };
    }
    return { control, status: "missing", reason: "No valid evidence has been supplied for this required control." };
  });
  const hasBlockingFailure = controls.some((result) => result.control.severity === "blocking" && result.status !== "satisfied");
  return { status: hasBlockingFailure ? "BLOCKED" : "ELIGIBLE", riskSignals, controls };
};

const canonicalReceiptBody = (receipt: Omit<ReleaseReceipt, "fingerprint">): string => JSON.stringify({
  ...receipt,
  riskSignals: [...receipt.riskSignals].map((signal) => ({ ...signal })),
  controls: [...receipt.controls].map((control) => ({ ...control, citationIds: [...control.citationIds] }))
});

const toHex = (buffer: ArrayBuffer): string => Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");

export const fingerprintReceipt = async (receipt: Omit<ReleaseReceipt, "fingerprint">): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalReceiptBody(receipt))));

export const createReleaseReceipt = async (
  policy: ReleasePolicy,
  release: ProposedRelease,
  result: ReleaseGateResult,
  createdAt: string
): Promise<ReleaseReceipt> => {
  const draft: Omit<ReleaseReceipt, "fingerprint"> = {
    schemaVersion: 1,
    releaseId: release.id,
    policyId: policy.id,
    policyVersion: policy.version,
    verdict: result.status,
    createdAt,
    command: release.command,
    environment: release.environment,
    service: release.service,
    riskSignals: result.riskSignals,
    controls: result.controls.map((resultControl) => ({
      controlId: resultControl.control.id,
      status: resultControl.status,
      citationIds: resultControl.control.citationIds,
      ...(resultControl.evidence ? { evidenceId: resultControl.evidence.id, evidenceProvenance: resultControl.evidence.provenance } : {})
    }))
  };
  return { ...draft, fingerprint: await fingerprintReceipt(draft) };
};

export const citationsForControl = (policy: ReleasePolicy, control: RunbookControl): Citation[] =>
  control.citationIds.flatMap((citationId) => {
    const citation = policy.citations.find((candidate) => candidate.id === citationId);
    return citation === undefined ? [] : [citation];
  });
