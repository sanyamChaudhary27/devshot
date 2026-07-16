"use server";

import { safeReturnPath } from "../../lib/auth/safe-return";
import { configuredSiteOrigin, isSupabaseConfigured } from "../../lib/supabase/config";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export type LoginState = { message: string; success: boolean };

const initialState: LoginState = { message: "", success: false };
export { initialState };

export async function requestMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const submittedEmail = formData.get("email");
  const email = typeof submittedEmail === "string" ? submittedEmail.trim().toLowerCase() : "";
  const submittedNextPath = formData.get("nextPath");
  const nextPath = safeReturnPath(typeof submittedNextPath === "string" ? submittedNextPath : undefined);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { message: "Enter a valid email address.", success: false };
  if (!isSupabaseConfigured()) return { message: "Authentication is not configured on this deployment yet.", success: false };

  let origin: string;
  try {
    origin = configuredSiteOrigin();
  } catch {
    return { message: "Authentication is not configured safely on this deployment yet.", success: false };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: new URL(`/auth/callback?next=${encodeURIComponent(nextPath)}`, origin).toString() }
  });
  return error
    ? { message: "We could not send a sign-in link. Please retry shortly.", success: false }
    : { message: "If this address can sign in, a secure link is on its way.", success: true };
}
