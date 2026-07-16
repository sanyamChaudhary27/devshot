const required = (value: string | undefined, name: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`Missing ${name}.`);
  return trimmed;
};

export const configuredSiteOrigin = (): string => {
  const value = required(process.env.SITE_URL, "SITE_URL");
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("SITE_URL must be an absolute URL.");
  }
  const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(isLocalhost && parsed.protocol === "http:")) {
    throw new Error("SITE_URL must use HTTPS outside localhost.");
  }
  return parsed.origin;
};

export const isSupabaseConfigured = (): boolean => Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
);

export const isSupabaseAdminConfigured = (): boolean => Boolean(
  isSupabaseConfigured() && process.env.SUPABASE_SECRET_KEY?.trim()
);

export const supabaseConfig = () => ({
  url: required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
  publishableKey: required(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
});

export const supabaseAdminConfig = () => ({
  url: required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
  secretKey: required(process.env.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY")
});
