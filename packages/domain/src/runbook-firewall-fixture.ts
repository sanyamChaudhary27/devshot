import type { EvidenceRecord, ProposedRelease, ReleasePolicy } from "./release-gate";

export const migrationRunbookFixture: ReleasePolicy = {
  id: "payments-migration-runbook",
  version: 1,
  title: "Payments production migration runbook",
  citations: [
    { id: "window", label: "Approved window", quote: "Production migrations may run only in an approved maintenance window recorded on the change ticket.", sourceSpan: { sourceId: "payments-runbook-v1", startOffset: 0, endOffset: 97 } },
    { id: "approval", label: "Change approval", quote: "The release owner must attach an approved change record before a production migration begins.", sourceSpan: { sourceId: "payments-runbook-v1", startOffset: 98, endOffset: 189 } },
    { id: "backup", label: "Backup receipt", quote: "Record a successful backup identifier before any migration that can delete or rewrite data.", sourceSpan: { sourceId: "payments-runbook-v1", startOffset: 190, endOffset: 278 } },
    { id: "rollback", label: "Tested rollback", quote: "Every migration must name a tested rollback command before the forward command is eligible to run.", sourceSpan: { sourceId: "payments-runbook-v1", startOffset: 279, endOffset: 379 } },
    { id: "impact", label: "Service impact", quote: "Acknowledge affected services and customer impact in the release record before execution.", sourceSpan: { sourceId: "payments-runbook-v1", startOffset: 380, endOffset: 467 } }
  ],
  controls: [
    { id: "maintenance-window", label: "Maintenance window", requirement: "Record the approved maintenance window on the change ticket.", type: "maintenance_window", severity: "blocking", citationIds: ["window"] },
    { id: "change-approval", label: "Change approval", requirement: "Attach an approved change record before the migration begins.", type: "approval", severity: "blocking", citationIds: ["approval"] },
    { id: "backup-receipt", label: "Backup receipt", requirement: "Record a successful backup identifier before a destructive migration.", type: "backup", severity: "blocking", citationIds: ["backup"] },
    { id: "rollback-plan", label: "Tested rollback", requirement: "Name a tested rollback command before the forward command is eligible.", type: "rollback_plan", severity: "blocking", citationIds: ["rollback"] },
    { id: "service-impact", label: "Service impact", requirement: "Acknowledge affected services and customer impact in the release record.", type: "service_impact_acknowledged", severity: "warning", citationIds: ["impact"] }
  ]
};

export const destructiveMigrationFixture: ProposedRelease = {
  id: "release-invoice-legacy-status",
  command: "pnpm prisma migrate deploy --environment production",
  environment: "production",
  service: "payments-api",
  migrationSummary: "Remove the legacy invoice status after a backfill.",
  migrationSql: "ALTER TABLE invoices DROP COLUMN legacy_status;"
};

const capturedAt = "2026-07-17T09:00:00.000Z";

export const blockedEvidenceFixture: readonly EvidenceRecord[] = [
  { id: "impact-ops-731", controlId: "service-impact", value: "OPS-731 acknowledges payments-api impact and the customer support notice.", provenance: "demo_fixture", capturedAt, status: "valid" }
];

export const eligibleEvidenceFixture: readonly EvidenceRecord[] = [
  { id: "window-ops-731", controlId: "maintenance-window", value: "OPS-731: 09:00–09:20 UTC approved maintenance window.", provenance: "demo_fixture", capturedAt, status: "valid" },
  { id: "approval-ops-731", controlId: "change-approval", value: "OPS-731 approved by the release owner.", provenance: "demo_fixture", capturedAt, status: "valid" },
  { id: "backup-payments-482", controlId: "backup-receipt", value: "backup/payments-2026-07-17-482 completed successfully.", provenance: "demo_fixture", capturedAt, status: "valid" },
  { id: "rollback-20260717", controlId: "rollback-plan", value: "Tested rollback: pnpm prisma migrate resolve --rolled-back 202607170900_remove_legacy_status.", provenance: "demo_fixture", capturedAt, status: "valid" },
  { id: "impact-ops-731", controlId: "service-impact", value: "OPS-731 acknowledges payments-api impact and the customer support notice.", provenance: "demo_fixture", capturedAt, status: "valid" }
];
