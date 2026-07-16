import Link from "next/link";

export default function Home() {
  return <main className="home-shell">
    <header className="home-topbar"><Link className="wordmark" href="/">skill<span>trials</span></Link><div className="home-topbar__links"><Link className="text-link" href="/sample">Play the sample</Link><Link className="text-link" href="/login">Author sign in</Link></div></header>
    <section className="home-hero">
      <p className="eyebrow">Source material → consequential practice</p>
      <h1>Prove you understand it. Don’t just answer about it.</h1>
      <p>SkillTrials turns a policy, lesson, or runbook into a cited decision simulation. Learners make choices, see the state change, and leave with an evidence-backed debrief.</p>
      <div className="home-actions"><Link className="ui-action" href="/login?next=/create">Sign in to create</Link><Link className="ui-action ui-action--secondary" href="/sample">Play the lab-safety trial</Link></div>
    </section>
    <section className="home-proof" aria-label="Product proof"><div><strong>1. Source in</strong><span>Bounded text with private storage designed for the next slice.</span></div><div><strong>2. Scenario verified</strong><span>Exact citations, typed state transitions, reachable terminal paths.</span></div><div><strong>3. Decision practice</strong><span>A real playable runtime—no model call while the learner plays.</span></div></section>
  </main>;
}
