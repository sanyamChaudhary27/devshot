import type { ModelRequest } from "@skilltrials/generation";

type ApiError = { error?: { message?: unknown } };

const configuredModel = (): string => process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra";
const configuredReasoning = (): "low" | "medium" => process.env.OPENAI_REASONING_EFFORT === "medium" ? "medium" : "low";
const configuredMaxOutputTokens = (): number => {
  const value = Number.parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? "12000", 10);
  return Number.isInteger(value) && value >= 1_000 && value <= 16_000 ? value : 12_000;
};

const outputText = (payload: unknown): string | null => {
  if (typeof payload !== "object" || payload === null) return null;
  const response = payload as { output_text?: unknown; output?: unknown };
  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) return response.output_text;
  if (!Array.isArray(response.output)) return null;
  for (const item of response.output) {
    if (typeof item !== "object" || item === null) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (typeof part !== "object" || part === null) continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim().length > 0) return text;
    }
  }
  return null;
};

export const isOpenAIConfigured = (): boolean => Boolean(process.env.OPENAI_API_KEY?.trim());

/** Server-only Responses API adapter. It never returns model payloads or credentials to the client. */
export const generateStructuredScenario = async (request: ModelRequest): Promise<unknown> => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model: configuredModel(),
      store: false,
      max_output_tokens: configuredMaxOutputTokens(),
      reasoning: { effort: configuredReasoning() },
      instructions: request.instructions,
      input: request.input,
      text: {
        format: {
          type: "json_schema",
          name: request.schemaName ?? "skilltrials_scenario",
          strict: false,
          schema: request.jsonSchema
        }
      }
    })
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && typeof (payload as ApiError).error?.message === "string"
      ? (payload as ApiError).error?.message
      : "The model request failed.";
    throw new Error(`OPENAI_REQUEST_FAILED: ${message}`);
  }
  const text = outputText(payload);
  if (text === null) throw new Error("OPENAI_INVALID_RESPONSE");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("OPENAI_INVALID_JSON");
  }
};
