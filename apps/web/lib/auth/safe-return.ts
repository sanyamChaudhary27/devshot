const trustedOrigin = "https://skilltrials.invalid";

/** Limits authentication returns to a same-origin relative path. */
export const safeReturnPath = (value: string | undefined | null, fallback = "/dashboard"): string => {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return fallback;
  }
  const parsed = new URL(value, trustedOrigin);
  return parsed.origin === trustedOrigin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
};
