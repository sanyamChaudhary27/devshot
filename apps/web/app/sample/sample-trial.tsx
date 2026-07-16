import { laboratorySafetyFixture, laboratorySafetySource } from "@skilltrials/domain";
import { ScenarioTrial } from "../scenario-trial";

export function SampleTrial() {
  return <ScenarioTrial
    scenario={laboratorySafetyFixture}
    category="Laboratory safety"
    roleDescription="You are a lab learner. Read the available evidence, decide what to do before the transfer begins, and watch the safety state change. There are no hidden model calls during the run."
    sourceAttribution={<footer className="sample-attribution"><p>Grounded in <a href={laboratorySafetySource.url} rel="noreferrer" target="_blank">{laboratorySafetySource.title}</a>. {laboratorySafetySource.attribution} This public source supports the simulation; always follow your local laboratory procedure and instructor.</p></footer>}
  />;
}
