import type { Scenario } from "@skilltrials/domain";

export function TrialProof({ scenario }: { scenario: Scenario }) {
  const sceneCount = scenario.nodes.filter((node) => node.kind === "scene").length;
  const terminalCount = scenario.nodes.length - sceneCount;
  const choiceCount = scenario.nodes.reduce((total, node) => total + (node.kind === "scene" ? node.choices.length : 0), 0);

  return <section className="trial-proof-panel" aria-labelledby="trial-proof-title">
    <div>
      <p className="eyebrow">Private author proof</p>
      <h2 id="trial-proof-title">This is a decision model, not a generated quiz.</h2>
      <p>Every path is deterministic, reaches a terminal outcome, and is tied to the private source material below. The scenario passed schema, citation, graph, semantic-review, and disclosure checks before it became publishable.</p>
    </div>
    <dl className="trial-proof-stats">
      <div><dt>Decision nodes</dt><dd>{sceneCount}</dd></div>
      <div><dt>Meaningful actions</dt><dd>{choiceCount}</dd></div>
      <div><dt>Reachable endings</dt><dd>{terminalCount}</dd></div>
      <div><dt>Source citations</dt><dd>{scenario.citations.length}</dd></div>
    </dl>
    <details className="trial-proof-map">
      <summary>Inspect source-to-scenario evidence map</summary>
      <ul>{scenario.citations.map((citation) => <li key={citation.id}><strong>{citation.label}</strong><span>{citation.quote}</span></li>)}</ul>
    </details>
  </section>;
}
