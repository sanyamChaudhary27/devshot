import { createHash } from "node:crypto";
import { buildSourceDossier, generateTrialRequestSchema, generationBriefSchema, type GenerateTrialRequest, type VerifiedGeneration } from "@skilltrials/generation";
import { scenarioSchema } from "@skilltrials/domain";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "../supabase/admin";
import { findPrivateSourceDisclosures } from "./private-source-disclosure";

const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");
const byteLength = (value: string): number => Buffer.byteLength(value, "utf8");
const failureReason = (error: unknown): string => (error instanceof Error ? error.message : "Generation failed.").slice(0, 1_000);
const slugify = (value: string): string => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 42);
  return normalized || "untitled-trial";
};

const sourceSpanRows = (sourceId: string, dossier: ReturnType<typeof buildSourceDossier>) =>
  dossier.spans.map((span, ordinal) => ({
    source_id: sourceId,
    ordinal,
    start_char: span.startOffset,
    end_char: span.endOffset,
    label: span.label,
    text_content: span.text,
    content_sha256: sha256(span.text)
  }));

type StoredTrial = { id: string; slug: string; status: "draft" };

export const assertTrialIsSafeToPublish = async (user: User, trialId: string): Promise<void> => {
  const admin = createSupabaseAdminClient();
  const { data: trial, error: trialError } = await admin
    .from("trials")
    .select("id, source_id")
    .eq("id", trialId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (trialError || !trial) throw new Error("Could not load this trial for publication.");
  const { data: source } = await admin.from("sources").select("storage_bucket, storage_object_path, public_evidence_enabled").eq("id", trial.source_id).eq("owner_id", user.id).maybeSingle();
  const { data: version } = await admin.from("trial_versions").select("document").eq("trial_id", trial.id).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!source || !version) throw new Error("A valid private source and scenario version are required before publication.");
  const parsedScenario = scenarioSchema.safeParse(version.document);
  if (!parsedScenario.success) throw new Error("The saved scenario is invalid and cannot be published.");
  if (source.public_evidence_enabled) return;
  const { data: file, error: downloadError } = await admin.storage.from(source.storage_bucket).download(source.storage_object_path);
  if (downloadError || !file) throw new Error("The private source could not be checked before publication.");
  const disclosures = findPrivateSourceDisclosures(parsedScenario.data, await file.text());
  if (disclosures.length > 0) throw new Error("This trial contains copied private-source passages in public text. Regenerate it before publishing.");
};

export const markSourceFailed = async (user: User, sourceId: string, reason: string): Promise<void> => {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("sources")
    .update({ ingest_status: "failed", failure_reason: reason })
    .eq("id", sourceId)
    .eq("owner_id", user.id)
    .in("ingest_status", ["processing", "failed"]);
  if (error) throw new Error("Could not save the failed generation state.");
};

/** Stores private source material before model work so failed generations remain retryable. */
export const createPrivateSource = async (user: User, request: GenerateTrialRequest): Promise<void> => {
  const supabase = createSupabaseAdminClient();
  const dossier = buildSourceDossier({ sourceId: request.sourceId, title: request.sourceTitle, text: request.sourceText });
  const objectPath = `${user.id}/${request.sourceId}/source.txt`;
  const sourceRow = {
    id: request.sourceId,
    owner_id: user.id,
    title: request.sourceTitle,
    storage_bucket: "source-materials",
    storage_object_path: objectPath,
    mime_type: "text/plain",
    byte_size: byteLength(dossier.normalizedText),
    normalized_char_count: dossier.normalizedText.length,
    content_sha256: sha256(dossier.normalizedText),
    generation_brief: request.brief,
    public_evidence_enabled: request.publicEvidence.enabled,
    public_attribution_url: request.publicEvidence.attributionUrl ?? null,
    public_attribution_title: request.publicEvidence.attributionTitle ?? null,
    public_license_notice: request.publicEvidence.licenseNotice ?? null,
    public_evidence_rights_confirmed: request.publicEvidence.rightsConfirmed ?? false,
    ingest_status: "processing"
  };
  const { error: sourceError } = await supabase.from("sources").insert(sourceRow);
  if (sourceError) throw new Error("Could not save the private source record.");

  try {
    const { error: uploadError } = await supabase.storage.from("source-materials").upload(
      objectPath,
      new Blob([dossier.normalizedText], { type: "text/plain" }),
      { contentType: "text/plain", upsert: false }
    );
    if (uploadError) throw new Error("Could not store the private source text.");

    const { error: spansError } = await supabase.from("source_spans").insert(sourceSpanRows(request.sourceId, dossier));
    if (spansError) throw new Error("Could not save the source citations.");
  } catch (error) {
    await markSourceFailed(user, request.sourceId, failureReason(error));
    throw error;
  }
};

/** Rehydrates a failed private source without sending its text through the browser again. */
export const loadFailedSourceRetry = async (user: User, sourceId: string): Promise<GenerateTrialRequest> => {
  const supabase = createSupabaseAdminClient();
  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("id, title, storage_bucket, storage_object_path, generation_brief, ingest_status, public_evidence_enabled, public_attribution_url, public_attribution_title, public_license_notice, public_evidence_rights_confirmed")
    .eq("id", sourceId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (sourceError || !source || source.ingest_status !== "failed") throw new Error("This source is not available for retry.");

  const brief = generationBriefSchema.safeParse(source.generation_brief);
  if (!brief.success) throw new Error("The saved generation brief is invalid.");
  const { data: file, error: downloadError } = await supabase.storage.from(source.storage_bucket).download(source.storage_object_path);
  if (downloadError || !file) throw new Error("The private source text could not be loaded.");
  const normalizedText = await file.text();
  const dossier = buildSourceDossier({ sourceId: source.id, title: source.title, text: normalizedText });
  const { error: spansError } = await supabase
    .from("source_spans")
    .upsert(sourceSpanRows(source.id, dossier), { onConflict: "source_id,ordinal" });
  if (spansError) throw new Error("The source citations could not be repaired.");

  return generateTrialRequestSchema.parse({
    sourceId: source.id,
    sourceTitle: source.title,
    sourceText: dossier.normalizedText,
    brief: brief.data,
    publicEvidence: { enabled: source.public_evidence_enabled, ...(source.public_attribution_url ? { attributionUrl: source.public_attribution_url } : {}), ...(source.public_attribution_title ? { attributionTitle: source.public_attribution_title } : {}), ...(source.public_license_notice ? { licenseNotice: source.public_license_notice } : {}), rightsConfirmed: source.public_evidence_rights_confirmed }
  });
};

/** Persists only validated output. Each version is an immutable author-owned draft. */
export const persistGeneratedTrial = async (
  user: User,
  request: GenerateTrialRequest,
  result: Extract<VerifiedGeneration, { accepted: true }>
): Promise<StoredTrial> => {
  const admin = createSupabaseAdminClient();
  let createdTrialId: string | undefined;
  try {
    const slug = `${slugify(result.scenario.title)}-${request.sourceId.replaceAll("-", "").slice(0, 8)}`;
    const { data: trial, error: trialError } = await admin.from("trials").insert({
      owner_id: user.id,
      source_id: request.sourceId,
      title: result.scenario.title,
      summary: result.scenario.description.slice(0, 600),
      slug,
      status: "draft"
    }).select("id, slug").single();
    if (trialError || !trial) throw new Error("Could not create the trial draft.");
    createdTrialId = trial.id;

    const { error: versionError } = await admin.from("trial_versions").insert({
      trial_id: trial.id,
      version: 1,
      document: result.scenario,
      document_sha256: sha256(JSON.stringify(result.scenario)),
      generation_model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra",
      validation_report: { valid: true, attempts: result.attempts, grounded: true }
    });
    if (versionError) throw new Error("Could not save the immutable trial version.");

    const { error: readyError } = await admin.from("sources").update({ ingest_status: "ready", failure_reason: null }).eq("id", request.sourceId).eq("owner_id", user.id);
    if (readyError) throw new Error("The trial was saved, but its source status could not be finalized.");
    return { id: trial.id, slug: trial.slug, status: "draft" };
  } catch (error) {
    if (createdTrialId !== undefined) {
      await admin.from("trials").delete().eq("id", createdTrialId).eq("owner_id", user.id);
    }
    await markSourceFailed(user, request.sourceId, failureReason(error));
    throw error;
  }
};
