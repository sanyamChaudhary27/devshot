import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  stableUrl: z.string().url().max(500),
  upcomingUrl: z.string().url().max(500),
  runbook: z.string().trim().min(40).max(100_000)
}).strict();

const analysisSchema = z.object({
  verdict: z.enum(["BLOCK", "REVIEW", "READY"]),
  summary: z.string().trim().min(1).max(1_200),
  findings: z.array(z.object({
    id: z.string().trim().min(1).max(80), severity: z.enum(["high", "medium", "low"]), title: z.string().trim().min(1).max(160), explanation: z.string().trim().min(1).max(1_000), filePaths: z.array(z.string().trim().min(1).max(320)).max(12), runbookLines: z.array(z.number().int().positive()).max(12)
  }).strict()).max(20),
  safeguards: z.array(z.object({
    id: z.string().trim().min(1).max(80), label: z.string().trim().min(1).max(160), status: z.enum(["required", "not_required"]), explanation: z.string().trim().min(1).max(1_000), runbookLines: z.array(z.number().int().positive()).max(12)
  }).strict()).max(24),
  nextActions: z.array(z.string().trim().min(1).max(500)).min(1).max(12)
}).strict();

type Revision = { owner: string; repo: string; ref: string };

const parseRevisionUrl = (raw: string): Revision => {
  const url = new URL(raw);
  if (url.protocol !== "https:" || (url.hostname !== "github.com" && url.hostname !== "www.github.com")) throw new Error("Use an HTTPS GitHub branch, tag, or commit URL.");
  const parts = url.pathname.split("/").filter(Boolean);
  const [owner, rawRepo, kind, ...reference] = parts;
  const repo = rawRepo?.replace(/\.git$/, "");
  const isSupported = kind === "tree" || kind === "commit" || (kind === "releases" && reference[0] === "tag");
  const refParts = kind === "releases" ? reference.slice(1) : reference;
  if (!owner || !repo || !isSupported || refParts.length === 0) throw new Error("Each release must be a GitHub /tree/, /commit/, or /releases/tag/ URL.");
  return { owner, repo, ref: refParts.join("/") };
};

const githubFileSchema = z.object({ filename: z.string().min(1).max(320), status: z.string().min(1).max(40), additions: z.number().int().nonnegative(), deletions: z.number().int().nonnegative(), patch: z.string().max(20_000).optional() }).strict();
const githubCompareSchema = z.object({
  html_url: z.string().url(), base_commit: z.object({ sha: z.string().min(7).max(96) }).strict(), merge_base_commit: z.object({ sha: z.string().min(7).max(96) }).strict(), files: z.array(githubFileSchema).max(300)
}).strict();

const lineNumberedRunbook = (runbook: string): string => runbook.split(/\r?\n/).slice(0, 1_500).map((line, index) => `${index + 1}: ${line}`).join("\n");
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

const outputText = (response: unknown): string | undefined => {
  if (typeof response !== "object" || response === null) return undefined;
  const candidate = response as { output_text?: unknown; output?: unknown };
  if (typeof candidate.output_text === "string") return candidate.output_text;
  if (!Array.isArray(candidate.output)) return undefined;
  for (const item of candidate.output) {
    if (typeof item !== "object" || item === null) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) if (typeof part === "object" && part !== null && typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
  }
  return undefined;
};

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return error("Send a JSON body containing both release URLs and the runbook.", 400); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return error("Provide two valid GitHub release URLs and a runbook of at least 40 characters.", 400);

  let stable: Revision;
  let upcoming: Revision;
  try { stable = parseRevisionUrl(parsed.data.stableUrl); upcoming = parseRevisionUrl(parsed.data.upcomingUrl); } catch (caught) { return error(caught instanceof Error ? caught.message : "The GitHub URLs are invalid.", 400); }
  if (stable.owner.toLowerCase() !== upcoming.owner.toLowerCase() || stable.repo.toLowerCase() !== upcoming.repo.toLowerCase()) return error("Both release URLs must belong to the same GitHub repository.", 400);
  if (stable.ref === upcoming.ref) return error("Choose two different release revisions.", 400);

  const auth = process.env.GITHUB_TOKEN === undefined ? {} : { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` };
  const compareUrl = `https://api.github.com/repos/${encodeURIComponent(stable.owner)}/${encodeURIComponent(stable.repo)}/compare/${encodeURIComponent(stable.ref)}...${encodeURIComponent(upcoming.ref)}`;
  const githubResponse = await fetch(compareUrl, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...auth }, next: { revalidate: 0 } });
  if (githubResponse.status === 404) return error("GitHub could not compare those revisions. Check the URLs, or configure GITHUB_TOKEN for a private repository.", 422);
  if (!githubResponse.ok) return error("GitHub comparison failed. Try again shortly.", 502);
  const comparisonResult = githubCompareSchema.safeParse(await githubResponse.json());
  if (!comparisonResult.success) return error("GitHub returned an unsupported comparison response.", 502);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return error("Analysis is configured, but OPENAI_API_KEY is not set on this deployment yet.", 503);
  const files = comparisonResult.data.files.slice(0, 100);
  const diffContext = files.map((file) => `FILE ${file.filename}\nSTATUS ${file.status}; +${file.additions} -${file.deletions}\nPATCH\n${file.patch?.slice(0, 4_000) ?? "(no patch returned by GitHub)"}`).join("\n\n").slice(0, 160_000);
  const instructions = "You are a release-risk reviewer. Use only the provided GitHub comparison and numbered runbook. Do not claim tests ran or evidence exists unless the data shows it. Cite every runbook-derived finding with the applicable line numbers. BLOCK only for a concrete high-risk change whose required safeguard is absent or unclear; READY only when there are no material gaps; otherwise REVIEW. Return JSON matching the requested schema.";
  const reviewSchema = {
    type: "object",
    additionalProperties: false,
    required: ["verdict", "summary", "findings", "safeguards", "nextActions"],
    properties: {
      verdict: { type: "string", enum: ["BLOCK", "REVIEW", "READY"] },
      summary: { type: "string" },
      findings: {
        type: "array",
        items: {
          type: "object", additionalProperties: false,
          required: ["id", "severity", "title", "explanation", "filePaths", "runbookLines"],
          properties: {
            id: { type: "string" }, severity: { type: "string", enum: ["high", "medium", "low"] }, title: { type: "string" }, explanation: { type: "string" }, filePaths: { type: "array", items: { type: "string" } }, runbookLines: { type: "array", items: { type: "integer" } }
          }
        }
      },
      safeguards: {
        type: "array",
        items: {
          type: "object", additionalProperties: false,
          required: ["id", "label", "status", "explanation", "runbookLines"],
          properties: {
            id: { type: "string" }, label: { type: "string" }, status: { type: "string", enum: ["required", "not_required"] }, explanation: { type: "string" }, runbookLines: { type: "array", items: { type: "integer" } }
          }
        }
      },
      nextActions: { type: "array", items: { type: "string" } }
    }
  };
  const modelResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6",
      reasoning: { effort: "medium" },
      instructions,
      input: `STABLE: ${stable.ref}\nUPCOMING: ${upcoming.ref}\n\nRUNBOOK\n${lineNumberedRunbook(parsed.data.runbook)}\n\nGITHUB COMPARE\n${diffContext}`,
      text: { format: { type: "json_schema", name: "release_review", strict: true, schema: reviewSchema } }
    })
  });
  if (!modelResponse.ok) return error("GPT analysis failed. Check the deployment model and API key, then retry.", 502);
  const text = outputText(await modelResponse.json());
  if (!text) return error("GPT did not return a structured release review.", 502);
  let analysis: z.infer<typeof analysisSchema>;
  try { analysis = analysisSchema.parse(JSON.parse(text)); } catch { return error("GPT returned an invalid release review. Please retry.", 502); }
  const maxRunbookLine = parsed.data.runbook.split(/\r?\n/).length;
  if (analysis.findings.some((finding) => finding.runbookLines.some((line) => line > maxRunbookLine)) || analysis.safeguards.some((safeguard) => safeguard.runbookLines.some((line) => line > maxRunbookLine))) return error("GPT returned citations outside the supplied runbook. Please retry.", 502);
  return NextResponse.json({ repository: `${stable.owner}/${stable.repo}`, compareUrl: comparisonResult.data.html_url, baseRevision: comparisonResult.data.merge_base_commit.sha, proposedRevision: comparisonResult.data.base_commit.sha, changedFiles: files.map((file) => ({ path: file.filename, status: file.status, additions: file.additions, deletions: file.deletions })), analysis });
}
