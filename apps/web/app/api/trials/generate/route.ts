import { generateTrialRequestSchema, generateVerifiedScenario } from "@skilltrials/generation";
import { NextResponse } from "next/server";
import { generateStructuredScenario, isOpenAIConfigured } from "../../../../lib/openai";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "../../../../lib/supabase/config";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { createPrivateSource, markSourceFailed, persistGeneratedTrial } from "../../../../lib/trials/persistence";
import { enforceGenerationBudget } from "../../../../lib/trials/generation-budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const error = (message: string, status: number, details?: readonly string[], sourceRetained = false) =>
  NextResponse.json({ error: message, ...(details && details.length > 0 ? { details } : {}), ...(sourceRetained ? { sourceRetained: true } : {}) }, { status });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return error("Private author storage is not configured on this deployment yet.", 503);
  }
  if (!isSupabaseAdminConfigured()) {
    return error("Validated scenario persistence is not configured on this deployment yet.", 503);
  }
  if (!isOpenAIConfigured()) {
    return error("Generation is not configured on this deployment yet. Add OPENAI_API_KEY on the server, then retry.", 503);
  }
  let body: unknown;
  let sourceRetained = false;
  try {
    body = await request.json();
  } catch {
    return error("Send a JSON generation request.", 400);
  }
  const parsed = generateTrialRequestSchema.safeParse(body);
  if (!parsed.success) {
    return error("The source or generation brief is invalid.", 400, parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return error("Sign in before creating a private trial.", 401);
    await enforceGenerationBudget(user);
    await createPrivateSource(user, parsed.data);
    sourceRetained = true;
    let result;
    try {
      result = await generateVerifiedScenario(parsed.data, { generate: generateStructuredScenario, verify: generateStructuredScenario });
    } catch (caught) {
      await markSourceFailed(user, parsed.data.sourceId, caught instanceof Error ? caught.message.slice(0, 1_000) : "Generation failed.");
      throw caught;
    }
    if (!result.accepted) {
      await markSourceFailed(user, parsed.data.sourceId, "The generated scenario did not pass grounding and playability checks.");
      return error("The generated scenario could not pass grounding and playability checks. No draft was published.", 422, result.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`), sourceRetained);
    }
    const trial = await persistGeneratedTrial(user, parsed.data, result);
    return NextResponse.json({ scenario: result.scenario, attempts: result.attempts, trial });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Generation failed unexpectedly.";
    if (message === "OPENAI_NOT_CONFIGURED") return error("Generation is not configured on this deployment yet.", 503, undefined, sourceRetained);
    if (message === "GENERATION_RATE_LIMITED") return error("You have reached the generation limit for this hour. Try again later.", 429);
    if (message === "GENERATION_BUDGET_UNAVAILABLE") return error("Generation usage checks are temporarily unavailable. Please retry shortly.", 503);
    if (message.startsWith("OPENAI_REQUEST_FAILED")) return error("The model request failed. Please retry once the service is available.", 502, undefined, sourceRetained);
    if (message.startsWith("OPENAI_INVALID")) return error("The model returned an unusable response. No trial was published.", 502, undefined, sourceRetained);
    return error("Generation failed unexpectedly. No trial was published.", 500, undefined, sourceRetained);
  }
}
