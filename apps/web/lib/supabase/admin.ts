import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdminConfig } from "./config";

/**
 * Privileged client for immutable, server-validated artifacts only.
 * Route handlers authenticate the caller before this client is used.
 */
export const createSupabaseAdminClient = () => {
  const { url, secretKey } = supabaseAdminConfig();
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
};
