import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

/** Creates one cookie-backed, RLS-bound client for the current server request. */
export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseConfig();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. proxy.ts handles refreshes.
        }
      }
    }
  });
};
