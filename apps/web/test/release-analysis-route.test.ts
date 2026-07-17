import { describe, expect, it } from "vitest";
import { POST } from "../app/api/release/analyze/route";

const requestFor = (body: unknown) => new Request("http://localhost/api/release/analyze", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body)
});

describe("POST /api/release/analyze", () => {
  it("rejects malformed release-review requests before any external request", async () => {
    const response = await POST(requestFor({ stableUrl: "not a url", upcomingUrl: "also not a url", runbook: "too short" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Provide two valid GitHub release URLs and a runbook of at least 40 characters." });
  });

  it("requires two revisions from the same repository before fetching GitHub", async () => {
    const response = await POST(requestFor({
      stableUrl: "https://github.com/acme/payments/tree/main",
      upcomingUrl: "https://github.com/other/payments/tree/release",
      runbook: "A production migration requires a documented backup and tested rollback plan."
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Both release URLs must belong to the same GitHub repository." });
  });
});
