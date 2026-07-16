import { z } from "zod";

const id = z.string().trim().min(1).max(96);
const shortText = z.string().trim().min(1).max(240);
const longText = z.string().trim().min(1).max(4_000);
const citationQuote = z.string().trim().min(1).max(320);
const citationIds = z.array(id).min(1).max(12);

export const sourceSpanSchema = z
  .object({
    sourceId: id,
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().positive()
  })
  .strict()
  .refine((span) => span.endOffset > span.startOffset, {
    message: "endOffset must be greater than startOffset"
  });

export const citationSchema = z
  .object({
    id,
    label: shortText,
    quote: citationQuote,
    sourceSpan: sourceSpanSchema
  })
  .strict();

export const learningObjectiveSchema = z
  .object({
    id,
    statement: longText,
    citationIds
  })
  .strict();

export const metricSchema = z
  .object({
    id,
    label: shortText,
    initialValue: z.number().min(0).max(100),
    description: shortText,
    direction: z.enum(["higher_is_better", "lower_is_better"])
  })
  .strict();

export const consequenceSchema = z
  .object({
    text: longText,
    citationIds
  })
  .strict();

export const choiceSchema = z
  .object({
    id,
    label: shortText,
    rationale: longText,
    citationIds,
    nextNodeId: id,
    consequence: consequenceSchema,
    metricDeltas: z.record(id, z.number().finite().min(-100).max(100)).default({}),
    setFlags: z.record(id, z.boolean()).default({})
  })
  .strict();

export const evidenceSchema = z
  .object({
    id,
    label: shortText,
    body: longText,
    citationIds
  })
  .strict();

export const sceneNodeSchema = z
  .object({
    id,
    kind: z.literal("scene"),
    title: shortText,
    situation: longText,
    citationIds,
    evidence: z.array(evidenceSchema).min(1).max(8),
    choices: z.array(choiceSchema).min(2).max(4)
  })
  .strict();

export const terminalNodeSchema = z
  .object({
    id,
    kind: z.literal("terminal"),
    outcome: z.enum(["success", "mixed", "failure"]),
    title: shortText,
    debrief: longText,
    citationIds
  })
  .strict();

export const scenarioNodeSchema = z.discriminatedUnion("kind", [sceneNodeSchema, terminalNodeSchema]);

export const scenarioSchema = z
  .object({
    id,
    version: z.number().int().positive(),
    title: shortText,
    description: longText,
    startNodeId: id,
    citations: z.array(citationSchema).min(1).max(32),
    learningObjectives: z.array(learningObjectiveSchema).min(1).max(12),
    metrics: z.array(metricSchema).min(1).max(8),
    nodes: z.array(scenarioNodeSchema).min(3).max(64)
  })
  .strict();

export type SourceSpan = z.infer<typeof sourceSpanSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type LearningObjective = z.infer<typeof learningObjectiveSchema>;
export type Metric = z.infer<typeof metricSchema>;
export type Consequence = z.infer<typeof consequenceSchema>;
export type Choice = z.infer<typeof choiceSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type SceneNode = z.infer<typeof sceneNodeSchema>;
export type TerminalNode = z.infer<typeof terminalNodeSchema>;
export type ScenarioNode = z.infer<typeof scenarioNodeSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
