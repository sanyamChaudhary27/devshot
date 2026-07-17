import { describe, expect, it } from "vitest";
import { MAX_UNIFIED_DIFF_CHARACTERS, parseUnifiedDiff } from "../src/index.js";

describe("parseUnifiedDiff", () => {
  it("counts changed lines per file without treating headers as additions or deletions", () => {
    const summary = parseUnifiedDiff([
      "diff --git a/apps/api/src/release.ts b/apps/api/src/release.ts",
      "index 1234567..89abcde 100644",
      "--- a/apps/api/src/release.ts",
      "+++ b/apps/api/src/release.ts",
      "@@ -4,2 +4,3 @@ export const release = () => {",
      "-  return 'pending';",
      "+  validatePolicy();",
      "+  return 'eligible';",
      " }"
    ].join("\n"));

    expect(summary).toEqual({
      changedFiles: [{ path: "apps/api/src/release.ts", additions: 2, deletions: 1, isMigrationPath: false }],
      additions: 2,
      deletions: 1,
      migrationPaths: []
    });
  });

  it("detects changed migration paths across supported migration conventions", () => {
    const summary = parseUnifiedDiff([
      "diff --git a/supabase/migrations/202607170900_release.sql b/supabase/migrations/202607170900_release.sql",
      "--- a/supabase/migrations/202607170900_release.sql",
      "+++ b/supabase/migrations/202607170900_release.sql",
      "@@ -0,0 +1 @@",
      "+ALTER TABLE invoices DROP COLUMN legacy_status;",
      "diff --git a/apps/api/src/routes.ts b/apps/api/src/routes.ts",
      "--- a/apps/api/src/routes.ts",
      "+++ b/apps/api/src/routes.ts",
      "@@ -1 +1 @@",
      "-export const mode = 'old';",
      "+export const mode = 'new';"
    ].join("\n"));

    expect(summary.changedFiles).toEqual([
      { path: "supabase/migrations/202607170900_release.sql", additions: 1, deletions: 0, isMigrationPath: true },
      { path: "apps/api/src/routes.ts", additions: 1, deletions: 1, isMigrationPath: false }
    ]);
    expect(summary.migrationPaths).toEqual(["supabase/migrations/202607170900_release.sql"]);
  });

  it("supports a plain unified diff with a created file", () => {
    const summary = parseUnifiedDiff([
      "--- /dev/null",
      "+++ db/migrate/20260717_add_receipts.sql",
      "@@ -0,0 +1,2 @@",
      "+CREATE TABLE receipts ();",
      "+CREATE INDEX receipts_created_at ON receipts (created_at);"
    ].join("\n"));

    expect(summary.changedFiles).toEqual([
      { path: "db/migrate/20260717_add_receipts.sql", additions: 2, deletions: 0, isMigrationPath: true }
    ]);
  });

  it("keeps multiple plain unified files separate and counts header-like content inside hunks", () => {
    const summary = parseUnifiedDiff([
      "--- docs/old.txt",
      "+++ docs/new.txt",
      "@@ -1 +1 @@",
      "--- operator note",
      "+updated operator note",
      "--- /dev/null",
      "+++ migrations/20260717_add_audit.sql",
      "@@ -0,0 +1 @@",
      "+CREATE TABLE audit_log ();"
    ].join("\n"));

    expect(summary.changedFiles).toEqual([
      { path: "docs/new.txt", additions: 1, deletions: 1, isMigrationPath: false },
      { path: "migrations/20260717_add_audit.sql", additions: 1, deletions: 0, isMigrationPath: true }
    ]);
  });

  it("rejects unbounded or malformed input rather than guessing", () => {
    expect(() => parseUnifiedDiff("not a diff")).toThrow("no changed file headers");
    expect(() => parseUnifiedDiff(`diff --git a/../secret b/../secret\n@@ -0,0 +1 @@\n+x`)).toThrow("unsafe path");
    expect(() => parseUnifiedDiff("x".repeat(MAX_UNIFIED_DIFF_CHARACTERS + 1))).toThrow("no larger");
  });
});
