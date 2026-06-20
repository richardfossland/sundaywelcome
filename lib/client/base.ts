"use client";

/** Public origin for share links / QR codes. Prefers the build-time
 * NEXT_PUBLIC_BASE_URL, falls back to the current origin in the browser. */
export function shareBase(): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
