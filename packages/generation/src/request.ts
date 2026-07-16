import { z } from "zod";
import type { GenerationBrief } from "./prompt";

export const generationBriefSchema = z.object({
  audience: z.string().trim().min(2).max(160),
  difficulty: z.enum(["introductory", "intermediate", "advanced"]),
  estimatedMinutes: z.number().int().min(3).max(15)
}).strict();

export const generateTrialRequestSchema = z.object({
  sourceId: z.string().uuid(),
  sourceTitle: z.string().trim().min(2).max(240),
  sourceText: z.string().min(80).max(40_000),
  brief: generationBriefSchema,
  publicEvidence: z.object({
    enabled: z.boolean(),
    attributionUrl: z.string().url().max(2_048).optional(),
    attributionTitle: z.string().trim().min(2).max(240).optional(),
    licenseNotice: z.string().trim().min(2).max(320).optional(),
    rightsConfirmed: z.boolean().optional()
  }).strict()
}).strict().superRefine((value, context) => {
  if (value.publicEvidence.enabled) {
    (["attributionUrl", "attributionTitle", "licenseNotice"] as const).forEach((field) => {
      if (value.publicEvidence[field] === undefined) {
        context.addIssue({ code: "custom", path: ["publicEvidence", field], message: `${field} is required when public evidence is enabled` });
      }
    });
    if (value.publicEvidence.rightsConfirmed !== true) {
      context.addIssue({ code: "custom", path: ["publicEvidence", "rightsConfirmed"], message: "Confirm that you have permission to share source excerpts publicly" });
    }
  }
});

export type GenerateTrialRequest = z.infer<typeof generateTrialRequestSchema>;
export type ValidGenerationBrief = GenerationBrief;
