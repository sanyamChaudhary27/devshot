"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateVerifiedScenario } from "@skilltrials/generation";
import { generateStructuredScenario, isOpenAIConfigured } from "../../lib/openai";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "../../lib/supabase/config";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../lib/supabase/admin";
import { assertTrialIsSafeToPublish, loadFailedSourceRetry, markSourceFailed, persistGeneratedTrial } from "../../lib/trials/persistence";
import { enforceGenerationBudget } from "../../lib/trials/generation-budget";

const validId = (value: FormDataEntryValue | null): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);

export async function publishTrial(formData: FormData): Promise<void> {
  const trialId = formData.get("trialId");
  if (!validId(trialId)) throw new Error("Invalid trial id.");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const admin = createSupabaseAdminClient();
  const { data: trial } = await admin.from("trials").select("id, slug").eq("id", trialId).eq("owner_id", user.id).maybeSingle();
  if (!trial) throw new Error("Trial not found.");
  const { data: latestVersion } = await admin.from("trial_versions").select("id").eq("trial_id", trial.id).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!latestVersion) throw new Error("A valid version is required before publication.");
  await assertTrialIsSafeToPublish(user, trial.id);

  const { error } = await admin.from("trials").update({
    status: "published",
    published_version_id: latestVersion.id,
    published_at: new Date().toISOString()
  }).eq("id", trial.id).eq("owner_id", user.id);
  if (error) throw new Error("Could not publish this trial.");
  revalidatePath("/dashboard");
  revalidatePath(`/t/${trial.slug}`);
}

export async function retryFailedSource(formData: FormData): Promise<void> {
  const sourceId = formData.get("sourceId");
  if (!validId(sourceId)) redirect("/dashboard?retry=unavailable");
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured() || !isOpenAIConfigured()) {
    redirect("/dashboard?retry=unavailable");
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  let destination = "/dashboard?retry=failed";
  let retrySourceWasLoaded = false;
  try {
    await enforceGenerationBudget(user);
    const request = await loadFailedSourceRetry(user, sourceId);
    retrySourceWasLoaded = true;
    const result = await generateVerifiedScenario(request, { generate: generateStructuredScenario, verify: generateStructuredScenario });
    if (!result.accepted) {
      await markSourceFailed(user, sourceId, "The retry did not pass grounding and playability checks.");
    } else {
      const trial = await persistGeneratedTrial(user, request, result);
      destination = `/trials/${trial.slug}/preview`;
    }
  } catch (caught) {
    if (caught instanceof Error && caught.message === "GENERATION_RATE_LIMITED") {
      destination = "/dashboard?retry=limited";
    }
    if (retrySourceWasLoaded) {
      await markSourceFailed(user, sourceId, caught instanceof Error ? caught.message.slice(0, 1_000) : "Retry failed.");
    }
  }
  revalidatePath("/dashboard");
  redirect(destination);
}
