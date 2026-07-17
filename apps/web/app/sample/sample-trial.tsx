import { laboratorySafetyFixture, laboratorySafetySource } from "@skilltrials/domain";
import { ScenarioTrial } from "../scenario-trial";

export function SampleTrial() {
  return <ScenarioTrial
    scenario={laboratorySafetyFixture}
    category="Laboratory safety"
    roleDescription="You are the designated safety lead for a solvent transfer. This is not a question to answer: your choices set the conditions under which the experiment may proceed. Inspect the cited evidence, commit to a plan, and review the resulting branch. There are no hidden model calls during the run."
    sourceAttribution={<footer className="sample-attribution"><p>Grounded in <a href={laboratorySafetySource.url} rel="noreferrer" target="_blank">{laboratorySafetySource.title}</a>. {laboratorySafetySource.attribution} This public source supports the simulation; always follow your local laboratory procedure and instructor.</p></footer>}
  />;
}
