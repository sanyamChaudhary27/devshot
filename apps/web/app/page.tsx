import Link from "next/link";

const proofPoints = [
  ["01", "Compile the runbook", "GPT-5.6 turns prose safeguards into typed controls with source spans."],
  ["02", "Prove every safeguard", "The release gate matches typed evidence to each cited control."],
  ["03", "Leave a receipt", "A deterministic verdict and command fingerprint make the decision inspectable."],
] as const;

export default function Home() {
  return (
    <main className="marketing-shell">
      <header className="marketing-nav">
        <Link className="brand" href="/" aria-label="Runbook Firewall home">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>runbook<span>firewall</span></span>
        </Link>
        <nav aria-label="Primary navigation" className="marketing-nav__links">
          <a href="#how-it-works">How it works</a>
          <Link href="/sample">Release gate demo</Link>
          <Link className="nav-cta" href="/sample">Try the gate</Link>
        </nav>
      </header>

      <section className="marketing-hero" aria-labelledby="hero-title">
        <div className="marketing-hero__copy">
          <p className="product-kicker"><span aria-hidden="true" />Pre-execution release gates</p>
          <h1 id="hero-title">Prove the safeguards before production pays the price.</h1>
          <p className="marketing-hero__lede">Runbook Firewall turns the release rules trapped in a team&apos;s runbook into a cited gate. A risky command stays blocked until the operator can show the required proof.</p>
          <div className="marketing-actions">
            <Link className="ui-action ui-action--primary" href="/sample">Open the dangerous migration <span aria-hidden="true">→</span></Link>
          </div>
          <ul className="marketing-trust" aria-label="Product guarantees">
            <li><span aria-hidden="true">✓</span> Cited release controls</li>
            <li><span aria-hidden="true">✓</span> Deterministic gate verdict</li>
            <li><span aria-hidden="true">✓</span> No command execution</li>
          </ul>
        </div>

        <div className="decision-canvas" aria-label="A release gate preview">
          <div className="decision-canvas__chrome"><span /><span /><p>release / payments-api / production</p></div>
          <div className="source-card">
            <div className="source-card__meta"><span>runbook</span><span>Cited safeguard</span></div>
            <p>“Record a successful backup identifier before any migration that can delete or rewrite data.”</p>
            <small>Payments migration runbook · control 03</small>
          </div>
          <div className="decision-flow" aria-hidden="true"><span /></div>
          <div className="decision-node decision-node--active">
            <span className="node-label">Proposed command</span>
            <strong>DROP COLUMN legacy_status</strong>
            <p>Production migration · destructive schema change</p>
          </div>
          <div className="decision-branches" aria-hidden="true">
            <div className="decision-branch decision-branch--risk"><span>Backup receipt</span><b>Missing</b></div>
            <div className="decision-branch decision-branch--risk"><span>Tested rollback</span><b>Missing</b></div>
          </div>
          <div className="decision-canvas__footer"><span className="live-dot" aria-hidden="true" /> BLOCKED · 2 safeguards missing</div>
        </div>
      </section>

      <section className="marketing-proof" id="how-it-works" aria-labelledby="proof-title">
        <div className="marketing-proof__intro">
          <p className="product-kicker"><span aria-hidden="true" />Not another runbook chatbot</p>
          <h2 id="proof-title">A rule must survive the moment it matters.</h2>
          <p>Runbook Firewall separates interpretation from enforcement: GPT-5.6 compiles the source, while deterministic code owns the release verdict.</p>
        </div>
        <div className="proof-grid">
          {proofPoints.map(([number, title, description]) => (
            <article className="proof-card" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>
          ))}
        </div>
      </section>
    </main>
  );
}
