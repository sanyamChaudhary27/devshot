import { scenarioSchema } from "@skilltrials/domain";
import { notFound } from "next/navigation";
import { ScenarioTrial } from "../../scenario-trial";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { isSupabaseAdminConfigured } from "../../../lib/supabase/config";
import { sanitizePublicScenario } from "../../../lib/trials/public-scenario";

export const dynamic = "force-dynamic";

export default async function SharedTrialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !isSupabaseAdminConfigured()) notFound();
  const supabase = createSupabaseAdminClient();
  const { data: trial } = await supabase
    .from("trials")
    .select("id, published_version_id, source_id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!trial?.published_version_id) notFound();
  const { data: source } = await supabase
    .from("sources")
    .select("public_evidence_enabled, public_attribution_url, public_attribution_title, public_license_notice, public_evidence_rights_confirmed")
    .eq("id", trial.source_id)
    .maybeSingle();
  const { data: version } = await supabase
    .from("trial_versions")
    .select("document")
    .eq("id", trial.published_version_id)
    .eq("trial_id", trial.id)
    .maybeSingle();
  const scenario = scenarioSchema.safeParse(version?.document);
  if (!scenario.success) notFound();
  const publicEvidence = source?.public_evidence_enabled === true && source.public_evidence_rights_confirmed === true && Boolean(source.public_attribution_url && source.public_attribution_title && source.public_license_notice);
  return <ScenarioTrial scenario={sanitizePublicScenario(scenario.data, publicEvidence)} category={publicEvidence ? "Published trial with public evidence" : "Published decision trial"} roleDescription={publicEvidence ? "You are practicing a source-grounded decision scenario with author-approved public evidence. No model calls occur while you play." : "You are practicing a source-grounded decision scenario. The author has verified its evidence; no model calls occur while you play."} sourceAttribution={publicEvidence ? <footer className="sample-attribution"><p>Source: <a href={source?.public_attribution_url} rel="noreferrer" target="_blank">{source?.public_attribution_title}</a>. {source?.public_license_notice}</p></footer> : undefined} />;
}
