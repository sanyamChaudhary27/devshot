import { describe, expect, it } from "vitest";
import {
  analyzeReleaseRisk,
  blockedEvidenceFixture,
  createReleaseReceipt,
  destructiveMigrationFixture,
  eligibleEvidenceFixture,
  evaluateReleaseGate,
  migrationRunbookFixture
} from "../src/index.js";

describe("Runbook Firewall release gate", () => {
  it("identifies a destructive production migration without inventing an integration", () => {
    const signals = analyzeReleaseRisk(destructiveMigrationFixture);
    expect(signals.map((signal) => signal.id)).toEqual(expect.arrayContaining(["production-target", "destructive-schema", "schema-mutation", "no-dry-run"]));
  });

  it("blocks the unsafe release and preserves cited missing safeguards", () => {
    const result = evaluateReleaseGate(migrationRunbookFixture, destructiveMigrationFixture, blockedEvidenceFixture);
    expect(result.status).toBe("BLOCKED");
    const backup = result.controls.find((control) => control.control.id === "backup-receipt");
    const rollback = result.controls.find((control) => control.control.id === "rollback-plan");
    expect(backup).toMatchObject({ status: "missing", control: { citationIds: ["backup"] } });
    expect(rollback).toMatchObject({ status: "missing", control: { citationIds: ["rollback"] } });
  });

  it("becomes eligible only when every blocking safeguard has typed evidence", () => {
    const result = evaluateReleaseGate(migrationRunbookFixture, destructiveMigrationFixture, eligibleEvidenceFixture);
    expect(result.status).toBe("ELIGIBLE");
    expect(result.controls.filter((control) => control.control.severity === "blocking").every((control) => control.status === "satisfied")).toBe(true);
    expect(result.controls.find((control) => control.control.id === "backup-receipt")?.evidence?.provenance).toBe("demo_fixture");
  });

  it("creates a stable receipt that changes when evidence changes", async () => {
    const eligible = evaluateReleaseGate(migrationRunbookFixture, destructiveMigrationFixture, eligibleEvidenceFixture);
    const blocked = evaluateReleaseGate(migrationRunbookFixture, destructiveMigrationFixture, blockedEvidenceFixture);
    const createdAt = "2026-07-17T09:01:00.000Z";
    const eligibleReceipt = await createReleaseReceipt(migrationRunbookFixture, destructiveMigrationFixture, eligible, createdAt);
    const repeatedReceipt = await createReleaseReceipt(migrationRunbookFixture, destructiveMigrationFixture, eligible, createdAt);
    const blockedReceipt = await createReleaseReceipt(migrationRunbookFixture, destructiveMigrationFixture, blocked, createdAt);
    expect(eligibleReceipt.fingerprint).toHaveLength(64);
    expect(eligibleReceipt.fingerprint).toBe(repeatedReceipt.fingerprint);
    expect(eligibleReceipt.fingerprint).not.toBe(blockedReceipt.fingerprint);
  });
});
