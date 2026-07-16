import type { Scenario } from "./scenario";

export const incidentResponseFixture: Scenario = {
  id: "incident-response-drill",
  version: 1,
  title: "The checkout outage",
  description: "Practice the first minutes of a payment incident using a grounded response runbook.",
  startNodeId: "triage-alert",
  citations: [
    {
      id: "runbook-severity",
      label: "Severity classification",
      quote: "Classify an incident as P1 when checkout is unavailable for a material share of customers.",
      sourceSpan: { sourceId: "incident-runbook-v1", startOffset: 0, endOffset: 91 }
    },
    {
      id: "runbook-page",
      label: "P1 notification",
      quote: "For a P1 incident, page the incident commander and payments on-call immediately.",
      sourceSpan: { sourceId: "incident-runbook-v1", startOffset: 92, endOffset: 174 }
    },
    {
      id: "runbook-rollback",
      label: "Safe mitigation",
      quote: "Use a documented rollback or feature flag before restarting payment services.",
      sourceSpan: { sourceId: "incident-runbook-v1", startOffset: 175, endOffset: 260 }
    },
    {
      id: "runbook-update",
      label: "Customer update",
      quote: "Post a customer-facing status update after the incident commander confirms scope.",
      sourceSpan: { sourceId: "incident-runbook-v1", startOffset: 261, endOffset: 347 }
    }
  ],
  learningObjectives: [
    {
      id: "classify-severity",
      statement: "Classify a material checkout failure with the correct severity.",
      citationIds: ["runbook-severity"]
    },
    {
      id: "mitigate-safely",
      statement: "Choose a documented mitigation before disruptive service actions.",
      citationIds: ["runbook-rollback"]
    }
  ],
  metrics: [
    { id: "customer-trust", label: "Customer trust", initialValue: 55, description: "Confidence that customers receive a safe, timely response.", direction: "higher_is_better" },
    { id: "service-stability", label: "Service stability", initialValue: 35, description: "Health of the checkout path.", direction: "higher_is_better" }
  ],
  nodes: [
    {
      id: "triage-alert",
      kind: "scene",
      title: "Checkout alerts spike",
      situation: "Checkout failures have reached 42% for ten minutes. Support has received reports from several regions.",
      citationIds: ["runbook-severity"],
      evidence: [
        {
          id: "error-rate",
          label: "Error-rate monitor",
          body: "The payment authorization error rate is 42%, far above the normal baseline.",
          citationIds: ["runbook-severity"]
        }
      ],
      choices: [
        {
          id: "declare-p1",
          label: "Declare a P1 and page the response team",
          rationale: "A material share of customers cannot complete checkout, which meets the runbook's P1 threshold.",
          citationIds: ["runbook-severity", "runbook-page"],
          nextNodeId: "mitigate-payment-path",
          consequence: {
            text: "The incident commander and payments on-call join the response channel with a shared scope.",
            citationIds: ["runbook-page"]
          },
          metricDeltas: { "customer-trust": 8 },
          setFlags: { p1Declared: true }
        },
        {
          id: "wait-for-more-data",
          label: "Wait for another monitoring interval",
          rationale: "Treating a widespread checkout failure as uncertain delays the required escalation.",
          citationIds: ["runbook-severity"],
          nextNodeId: "delayed-escalation",
          consequence: {
            text: "The failure continues while ownership remains unclear and support reports increase.",
            citationIds: ["runbook-severity"]
          },
          metricDeltas: { "customer-trust": -22, "service-stability": -12 },
          setFlags: { escalationDelayed: true }
        }
      ]
    },
    {
      id: "mitigate-payment-path",
      kind: "scene",
      title: "The payments team finds a bad flag rollout",
      situation: "A recently enabled payment-routing flag correlates with the failures. The team needs a safe first mitigation.",
      citationIds: ["runbook-rollback"],
      evidence: [
        {
          id: "deployment-log",
          label: "Deployment log",
          body: "The routing flag was enabled eleven minutes before failures began.",
          citationIds: ["runbook-rollback"]
        }
      ],
      choices: [
        {
          id: "disable-flag",
          label: "Disable the documented routing flag",
          rationale: "The runbook prioritizes a documented rollback or feature flag before service restarts.",
          citationIds: ["runbook-rollback"],
          nextNodeId: "contained-outage",
          consequence: {
            text: "The known-safe route is restored and checkout errors fall while the team continues investigation.",
            citationIds: ["runbook-rollback", "runbook-update"]
          },
          metricDeltas: { "customer-trust": 9, "service-stability": 48 },
          setFlags: { safeMitigationUsed: true }
        },
        {
          id: "restart-payments",
          label: "Restart payment services immediately",
          rationale: "Restarting before using the documented mitigation risks extending the interruption.",
          citationIds: ["runbook-rollback"],
          nextNodeId: "unsafe-restart",
          consequence: {
            text: "The restart drops in-flight checkout sessions and the routing problem remains active.",
            citationIds: ["runbook-rollback"]
          },
          metricDeltas: { "customer-trust": -18, "service-stability": -24 },
          setFlags: { unsafeRestart: true }
        }
      ]
    },
    {
      id: "contained-outage",
      kind: "terminal",
      outcome: "success",
      title: "Checkout is contained",
      debrief: "You recognized the P1 threshold, brought the accountable responders in, and used the documented feature-flag mitigation before disruptive actions.",
      citationIds: ["runbook-severity", "runbook-page", "runbook-rollback", "runbook-update"]
    },
    {
      id: "delayed-escalation",
      kind: "terminal",
      outcome: "failure",
      title: "The outage expands without ownership",
      debrief: "The response missed the documented P1 trigger, allowing a material checkout failure to continue without the required responders.",
      citationIds: ["runbook-severity", "runbook-page"]
    },
    {
      id: "unsafe-restart",
      kind: "terminal",
      outcome: "failure",
      title: "The restart deepens the disruption",
      debrief: "A disruptive restart was chosen before the documented rollback or feature-flag mitigation, worsening the customer impact.",
      citationIds: ["runbook-rollback"]
    }
  ]
};

/** Public primary-source metadata for the no-sign-in education demo. */
export const laboratorySafetySource = {
  title: "OSHA: Laboratory Safety — Chemical Fume Hoods",
  url: "https://www.osha.gov/sites/default/files/publications/OSHAquickfacts-lab-safety-chemical-fume-hoods.pdf",
  attribution: "Occupational Safety and Health Administration, Laboratory Safety — Chemical Fume Hoods (QuickFacts, OSHA 3407)."
} as const;

export const laboratorySafetyFixture: Scenario = {
  id: "laboratory-safety-fume-hood",
  version: 1,
  title: "The fume hood check",
  description: "A lab partner is ready to transfer a flammable solvent, but the hood's airflow indicator is out of range. Practice the decision sequence that protects the work before the experiment begins.",
  startNodeId: "airflow-warning",
  citations: [
    { id: "hood-primary-control", label: "Why the hood matters", quote: "The fume hood is often the primary control device for protecting laboratory workers when working with flammable and/or toxic chemicals.", sourceSpan: { sourceId: "osha-3407", startOffset: 0, endOffset: 135 } },
    { id: "hood-training", label: "Training before use", quote: "You should be trained to use it properly.", sourceSpan: { sourceId: "osha-3407", startOffset: 164, endOffset: 205 } },
    { id: "hood-on", label: "Verify the hood is on", quote: "Ensure that the hood is on.", sourceSpan: { sourceId: "osha-3407", startOffset: 207, endOffset: 234 } },
    { id: "hood-airflow", label: "Verify airflow", quote: "Make sure that the air gauge indicates that the air flow is within the required range.", sourceSpan: { sourceId: "osha-3407", startOffset: 236, endOffset: 322 } },
    { id: "hood-eye-protection", label: "Eye protection", quote: "Use appropriate eye protection.", sourceSpan: { sourceId: "osha-3407", startOffset: 349, endOffset: 380 } }
  ],
  learningObjectives: [
    { id: "verify-engineering-control", statement: "Verify a fume hood's operating status before relying on it as an engineering control.", citationIds: ["hood-primary-control", "hood-on", "hood-airflow"] },
    { id: "escalate-when-conditions-fail", statement: "Pause and involve trained supervision when the required operating conditions are not met.", citationIds: ["hood-training", "hood-airflow"] }
  ],
  metrics: [
    { id: "exposure-control", label: "Exposure control", initialValue: 46, description: "Whether the primary protective control has been verified before work starts.", direction: "higher_is_better" },
    { id: "lab-readiness", label: "Lab readiness", initialValue: 58, description: "Whether the team has a safe, deliberate plan to proceed.", direction: "higher_is_better" }
  ],
  nodes: [
    {
      id: "airflow-warning",
      kind: "scene",
      title: "The airflow indicator is out of range",
      situation: "Before a planned solvent transfer, you see the fume hood's airflow indicator reading outside its marked operating range. Your partner wants to start before the lab period ends.",
      citationIds: ["hood-primary-control", "hood-airflow"],
      evidence: [
        { id: "airflow-indicator", label: "Hood status indicator", body: "The indicator is not within the marked operating range. The planned transfer has not started.", citationIds: ["hood-airflow"] },
        { id: "planned-substance", label: "Experiment plan", body: "The activity calls for a flammable solvent transfer in the hood.", citationIds: ["hood-primary-control"] }
      ],
      choices: [
        {
          id: "pause-and-verify",
          label: "Pause the transfer and ask the instructor to verify a safe next step",
          rationale: "The hood is a primary protective control for this work, and the source calls for verifying airflow before use. A failed check is a reason to stop and involve trained supervision—not to guess.",
          citationIds: ["hood-primary-control", "hood-training", "hood-airflow"],
          nextNodeId: "supervised-plan",
          consequence: { text: "The transfer is paused before exposure begins. Your instructor confirms the room's procedure and identifies an available, functioning hood.", citationIds: ["hood-training", "hood-airflow"] },
          metricDeltas: { "exposure-control": 32, "lab-readiness": 18 },
          setFlags: { transferPaused: true, supervisionRequested: true }
        },
        {
          id: "start-anyway",
          label: "Start the transfer because the amount is small",
          rationale: "The planned amount does not replace the required check that the hood's airflow is within its operating range.",
          citationIds: ["hood-primary-control", "hood-airflow"],
          nextNodeId: "unverified-transfer",
          consequence: { text: "The team begins work while the primary control has not passed its required operating check.", citationIds: ["hood-primary-control", "hood-airflow"] },
          metricDeltas: { "exposure-control": -35, "lab-readiness": -26 },
          setFlags: { unverifiedTransfer: true }
        }
      ]
    },
    {
      id: "supervised-plan",
      kind: "scene",
      title: "Choose the controlled restart",
      situation: "The instructor confirms that this hood should not be used until it is checked. A functioning hood is available at another station, and your partner has the required eye protection.",
      citationIds: ["hood-training", "hood-on", "hood-airflow", "hood-eye-protection"],
      evidence: [
        { id: "alternate-hood", label: "Available control", body: "Another hood is confirmed on and its airflow indicator is within the marked operating range.", citationIds: ["hood-on", "hood-airflow"] },
        { id: "preflight-check", label: "Preflight reminder", body: "The source calls for training, verifying the hood is on, checking airflow, and using appropriate eye protection.", citationIds: ["hood-training", "hood-on", "hood-airflow", "hood-eye-protection"] }
      ],
      choices: [
        {
          id: "move-to-functioning-hood",
          label: "Move to the functioning hood and complete the preflight check",
          rationale: "Proceed only after the trained supervisor's plan confirms a hood is on, airflow is in range, and the team has appropriate eye protection.",
          citationIds: ["hood-training", "hood-on", "hood-airflow", "hood-eye-protection"],
          nextNodeId: "controlled-start",
          consequence: { text: "The team restarts the experiment with a verified primary control and the documented checks completed.", citationIds: ["hood-primary-control", "hood-on", "hood-airflow", "hood-eye-protection"] },
          metricDeltas: { "exposure-control": 22, "lab-readiness": 19 },
          setFlags: { verifiedHoodUsed: true, preflightCompleted: true }
        },
        {
          id: "rely-on-goggles-alone",
          label: "Use goggles, but transfer at the out-of-range hood",
          rationale: "Eye protection is an important check, but it does not make an unverified primary control ready for use.",
          citationIds: ["hood-primary-control", "hood-airflow", "hood-eye-protection"],
          nextNodeId: "incomplete-controls",
          consequence: { text: "The team treats one protective measure as a substitute for verifying the hood's airflow.", citationIds: ["hood-primary-control", "hood-airflow", "hood-eye-protection"] },
          metricDeltas: { "exposure-control": -29, "lab-readiness": -21 },
          setFlags: { controlsIncomplete: true }
        }
      ]
    },
    { id: "controlled-start", kind: "terminal", outcome: "success", title: "A controlled start", debrief: "You stopped before relying on an out-of-range hood, involved trained supervision, and restarted only with a functioning primary control and the documented preflight checks. That is decision practice: using evidence to change the plan before the consequence arrives.", citationIds: ["hood-primary-control", "hood-training", "hood-on", "hood-airflow", "hood-eye-protection"] },
    { id: "unverified-transfer", kind: "terminal", outcome: "failure", title: "The check was skipped", debrief: "The transfer started even though the hood's airflow had not been verified as within range. The source identifies the hood as a primary protective control and calls for that operating check before use.", citationIds: ["hood-primary-control", "hood-airflow"] },
    { id: "incomplete-controls", kind: "terminal", outcome: "failure", title: "One measure cannot replace the system", debrief: "Eye protection matters, but the documented checks work together. Treating it as a substitute for a functioning hood left the primary control unverified.", citationIds: ["hood-primary-control", "hood-airflow", "hood-eye-protection"] }
  ]
};
