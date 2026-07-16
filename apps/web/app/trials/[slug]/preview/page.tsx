import { scenarioSchema } from "@skilltrials/domain";
import { redirect, notFound } from "next/navigation";
import { ScenarioTrial } from "../../../scenario-trial";
import { TrialProof } from "../../../trial-proof";
import { isSupabaseConfigured } from "../../../../lib/supabase/config";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview draft | SkillTrials" };

const validSlug = (value: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

export default async function DraftPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validSlug(slug) || !isSupabaseConfigured()) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/trials/${slug}/preview`)}`);

  const { data: trial } = await supabase
    .from("trials")
    .select("id, title")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!trial) notFound();

  const { data: version } = await supabase
    .from("trial_versions")
    .select("document")
    .eq("trial_id", trial.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const parsed = scenarioSchema.safeParse(version?.document);
  if (!parsed.success) notFound();

  return <><TrialProof scenario={parsed.data} /><ScenarioTrial
    scenario={parsed.data}
    category="Private draft preview"
    roleDescription="You are previewing a private draft. It is playable, cited, and deterministic, but no public link exists until you publish this version."
  /></>;
}
