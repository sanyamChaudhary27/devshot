import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { publishTrial, retryFailedSource } from "./actions";

type TrialRow = { id: string; title: string; summary: string; slug: string; status: "draft" | "published" | "archived"; updated_at: string; published_at: string | null };
type FailedSourceRow = { id: string; title: string; failure_reason: string; created_at: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Your trials | SkillTrials" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ retry?: string }> }) {
  if (!isSupabaseConfigured()) {
    return <main className="message-page"><p className="eyebrow">Author workspace</p><h1>Connect Supabase to start authoring.</h1><p>Add the project URL and publishable key to the server environment. The bundled sample remains available while the product is in local demo mode.</p><Link className="ui-action" href="/sample">Play the sample</Link></main>;
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");
  const { data } = await supabase.from("trials").select("id, title, summary, slug, status, updated_at, published_at").eq("owner_id", user.id).order("updated_at", { ascending: false });
  const trials = (data ?? []) as TrialRow[];
  const { data: failedSourceData } = await supabase.from("sources").select("id, title, failure_reason, created_at").eq("owner_id", user.id).eq("ingest_status", "failed").order("created_at", { ascending: false });
  const failedSources = (failedSourceData ?? []) as FailedSourceRow[];
  const { retry } = await searchParams;

  return <main className="dashboard-shell">
    <header className="create-topbar"><Link className="wordmark" href="/">skill<span>trials</span></Link><form action={async () => { "use server"; const client = await createSupabaseServerClient(); await client.auth.signOut(); redirect("/"); }}><button className="ui-action ui-action--quiet" type="submit">Sign out</button></form></header>
    <section className="dashboard-head"><p className="eyebrow">Your author workspace</p><h1>Source-grounded trials</h1><p>Each draft is immutable at the scenario-version layer. Publish only after the author preview and citations look right.</p><Link className="ui-action" href="/create">Create a trial</Link></section>
    {retry === "failed" ? <p className="form-message form-message--error" role="alert">The retry did not produce a valid trial. Your source remains private and you can try again.</p> : null}
    {retry === "unavailable" ? <p className="form-message form-message--error" role="alert">Retry needs Supabase persistence and server-side generation to be configured.</p> : null}
    {retry === "limited" ? <p className="form-message form-message--error" role="alert">You have reached the generation limit for this hour. Your source remains private; retry later.</p> : null}
    <section className="trial-list" aria-label="Your trials">
      {trials.length === 0 ? <div className="empty-state"><h2>No trials yet.</h2><p>Paste a source, generate a verified draft, then return here to preview and publish a public player link.</p></div> : trials.map((trial) => <article className="trial-row" key={trial.id}><div><p className="eyebrow">{trial.status}</p><h2>{trial.title}</h2><p>{trial.summary}</p></div><div className="trial-row__actions">{trial.status === "published" ? <Link className="ui-action ui-action--secondary" href={`/t/${trial.slug}`}>Open public trial</Link> : <><Link className="ui-action ui-action--secondary" href={`/trials/${trial.slug}/preview`}>Preview draft</Link><form action={publishTrial}><input name="trialId" type="hidden" value={trial.id} /><button className="ui-action" type="submit">Publish trial</button></form></>}</div></article>)}
    </section>
    {failedSources.length > 0 ? <section className="trial-list" aria-label="Retryable source attempts"><p className="eyebrow">Retryable source attempts</p>{failedSources.map((source) => <article className="trial-row" key={source.id}><div><h2>{source.title}</h2><p>{source.failure_reason}</p><p className="field-note">The source text remains private. A retry uses the saved source and brief; it does not resubmit material from your browser.</p></div><form action={retryFailedSource}><input name="sourceId" type="hidden" value={source.id} /><button className="ui-action" type="submit">Retry generation</button></form></article>)}</section> : null}
  </main>;
}
