import { NextResponse } from "next/server";
import { parseUnifiedDiff, unifiedDiffInputSchema } from "@skilltrials/domain";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxChangedFiles = 100;
const maxPathCharacters = 320;

export const mergeParseRequestSchema = z.object({
  diff: unifiedDiffInputSchema
}).strict();

export const changedFileSchema = z.object({
  path: z.string().min(1).max(maxPathCharacters),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative()
}).strict();

export const mergeParseResponseSchema = z.object({
  changedFiles: z.array(changedFileSchema).min(1).max(maxChangedFiles)
}).strict();

const error = (message: string, details?: readonly string[]) =>
  NextResponse.json({ error: message, ...(details !== undefined && details.length > 0 ? { details } : {}) }, { status: 400 });

/**
 * Parses only pasted unified-diff metadata. It never executes commands, opens
 * repositories, stores the pasted diff, or returns the diff body to a client.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Send a JSON object with a pasted unified diff.");
  }

  const parsedRequest = mergeParseRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return error("The merge diff request is invalid.", parsedRequest.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
  }

  try {
    const summary = parseUnifiedDiff(parsedRequest.data.diff);
    const changedFiles = summary.changedFiles.map(({ path, additions, deletions }) => ({ path, additions, deletions }));
    return NextResponse.json(mergeParseResponseSchema.parse({ changedFiles }));
  } catch (caught) {
    const detail = caught instanceof Error ? caught.message.replace(/^Invalid unified diff: /, "") : "unsupported diff format";
    return error("The pasted text must be a safe, supported unified diff.", [detail]);
  }
}
