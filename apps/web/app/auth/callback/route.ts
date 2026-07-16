import { NextResponse } from "next/server";
import { safeReturnPath } from "../../../lib/auth/safe-return";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const nextPath = safeReturnPath(requestedNext);
  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(nextPath)}&auth=retry`, url.origin));
  }
  {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(nextPath)}&auth=retry`, url.origin));
  }
  return NextResponse.redirect(new URL(nextPath, url.origin));
}
