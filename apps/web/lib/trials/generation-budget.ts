import "server-only";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "../supabase/admin";

/** Atomically reserves one model-backed generation job for an authenticated author. */
export const enforceGenerationBudget = async (user: User): Promise<void> => {
  const supabase = createSupabaseAdminClient();
  const { data: accepted, error } = await supabase.rpc("reserve_generation_slot", { request_owner: user.id });
  if (error || typeof accepted !== "boolean") throw new Error("GENERATION_BUDGET_UNAVAILABLE");
  if (!accepted) throw new Error("GENERATION_RATE_LIMITED");
};
