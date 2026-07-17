import { describe, expect, it } from "vitest";
import { POST } from "../app/api/merge/parse/route";

const requestFor = (body: unknown): Request => new Request("http://localhost/api/merge/parse", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body)
});

describe("POST /api/merge/parse", () => {
  it("returns bounded changed-file metadata without returning diff contents", async () => {
    const response = await POST(requestFor({
      diff: [
        "diff --git a/apps/payments/src/invoices/status.ts b/apps/payments/src/invoices/status.ts",
        "index a1b2c3d..d4e5f6a 100644",
        "--- a/apps/payments/src/invoices/status.ts",
        "+++ b/apps/payments/src/invoices/status.ts",
        "@@ -1,2 +1,3 @@",
        "-export const legacyStatus = true;",
        "+export const legacyStatus = false;",
        "+export const statusVersion = 2;",
        "diff --git a/packages/db/migrations/20260717_remove_legacy.sql b/packages/db/migrations/20260717_remove_legacy.sql",
        "new file mode 100644",
        "--- /dev/null",
        "+++ b/packages/db/migrations/20260717_remove_legacy.sql",
        "@@ -0,0 +1 @@",
        "+ALTER TABLE invoices DROP COLUMN legacy_status;"
      ].join("\n")
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      changedFiles: [
        { path: "apps/payments/src/invoices/status.ts", additions: 2, deletions: 1 },
        { path: "packages/db/migrations/20260717_remove_legacy.sql", additions: 1, deletions: 0 }
      ]
    });
  });

  it("rejects malformed and unsafe diff requests with a validation response", async () => {
    const malformed = await POST(requestFor({ diff: "not a unified diff" }));
    expect(malformed.status).toBe(400);

    const unsafe = await POST(requestFor({ diff: "diff --git a/ok.ts b/../outside.ts" }));
    expect(unsafe.status).toBe(400);
  });
});
