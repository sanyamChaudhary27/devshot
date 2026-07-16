"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

export const createSupabaseBrowserClient = () => {
  const { url, publishableKey } = supabaseConfig();
  return createBrowserClient(url, publishableKey);
};
