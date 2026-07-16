import Link from "next/link";

const proofPoints = [
  ["01", "Bring the source", "A policy, lesson, or runbook is the factual boundary—not an inspiration prompt."],
  ["02", "Inspect the choices", "Every decision is connected to evidence, a visible consequence, and a reachable ending."],
  ["03", "Practice the moment", "The learner plays a fixed, reviewable simulation with no hidden model calls."],
] as const;

export default function Home() {
  return (
    <main className="marketing-shell">
      <header className="marketing-nav">
        <Link className="brand" href="/" aria-label="SkillTrials home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>skill<span>trials</span></span>
        </Link>
        <nav aria-label="Primary navigation" className="marketing-nav__links">
          <a href="#how-it-works">How it works</a>
          <Link href="/sample">Sample trial</Link>
          <Link className="nav-cta" href="/login?next=/create">Create a trial</Link>
        </nav>
      </header>

      <section className="marketing-hero" aria-labelledby="hero-title">
        <div className="marketing-hero__copy">
          <p className="product-kicker"><span aria-hidden="true" />Grounded decision practice</p>
          <h1 id="hero-title">Can they make the call when the answer is not on the page?</h1>
          <p className="marketing-hero__lede">SkillTrials turns trusted source material into an evidence-backed decision simulation. Learners commit to a choice, see the operational consequence, and leave with a cited debrief.</p>
          <div className="marketing-actions">
            <Link className="ui-action ui-action--primary" href="/sample">Play the 3-minute sample <span aria-hidden="true">→</span></Link>
            <Link className="ui-action ui-action--ghost" href="/login?next=/create">Build from a source</Link>
          </div>
          <ul className="marketing-trust" aria-label="Product guarantees">
            <li><span aria-hidden="true">✓</span> Cited claims and consequences</li>
            <li><span aria-hidden="true">✓</span> Deterministic playable runtime</li>
            <li><span aria-hidden="true">✓</span> Private sources by default</li>
          </ul>
        </div>

        <div className="decision-canvas" aria-label="A preview of SkillTrials turning source material into a decision graph">
          <div className="decision-canvas__chrome"><span /><span /><span /><p>trial / lab-safety / v1</p></div>
          <div className="source-card">
            <div className="source-card__meta"><span>01</span><span>Trusted source</span></div>
            <p>“Make sure that the air gauge indicates airflow is within the required range.”</p>
            <small>OSHA 3407 · cited excerpt</small>
          </div>
          <div className="decision-flow" aria-hidden="true"><span /></div>
          <div className="decision-node decision-node--active">
            <span className="node-label">Decision point</span>
            <strong>The airflow indicator is out of range.</strong>
            <p>What changes before the transfer starts?</p>
          </div>
          <div className="decision-branches" aria-hidden="true">
            <div className="decision-branch decision-branch--good"><span>Pause and verify</span><b>+32</b></div>
            <div className="decision-branch decision-branch--risk"><span>Start anyway</span><b>−35</b></div>
          </div>
          <div className="decision-canvas__footer"><span className="live-dot" aria-hidden="true" /> 2 outcomes reachable · 5 source citations</div>
        </div>
      </section>

      <section className="marketing-proof" id="how-it-works" aria-labelledby="proof-title">
        <div className="marketing-proof__intro">
          <p className="product-kicker"><span aria-hidden="true" />Why it is not another quiz generator</p>
          <h2 id="proof-title">Evidence before confidence.</h2>
          <p>SkillTrials makes the hidden part of practical understanding visible: the judgement between a source and an action.</p>
        </div>
        <div className="proof-grid">
          {proofPoints.map(([number, title, description]) => (
            <article className="proof-card" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-close" aria-labelledby="close-title">
        <p className="product-kicker"><span aria-hidden="true" />A finished learning artifact</p>
        <h2 id="close-title">Built for the decision that matters after the reading ends.</h2>
        <Link className="ui-action ui-action--primary" href="/sample">Open the sample trial <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
