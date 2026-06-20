// Framework-agnostic domain logic for newcomer cards — no Next/Supabase
// imports, so it is unit-testable and shared by the public submit API and the
// admin UI.

import type { ConnectInput, ConnectionStatus, VisitorType } from "./types";

export const VISITOR_TYPES: VisitorType[] = [
  "first_time",
  "returning",
  "new_to_area",
  "member",
  "other",
];

export const STATUS_ORDER: ConnectionStatus[] = [
  "new",
  "assigned",
  "contacted",
  "done",
  "archived",
];

/** Default interest checkboxes a fresh church starts with (Norwegian). */
export const DEFAULT_INTERESTS = [
  { key: "smaagruppe", label: "Smågruppe / fellesskap" },
  { key: "barn", label: "Barn og familie" },
  { key: "ungdom", label: "Ungdom" },
  { key: "frivillig", label: "Bli frivillig" },
  { key: "samtale", label: "En samtale / forbønn" },
  { key: "nyhetsbrev", label: "Nyhetsbrev på e-post" },
];

export function statusLabel(s: ConnectionStatus): string {
  switch (s) {
    case "new":
      return "Ny";
    case "assigned":
      return "Tildelt";
    case "contacted":
      return "Kontaktet";
    case "done":
      return "Fullført";
    case "archived":
      return "Arkivert";
  }
}

export function visitorTypeLabel(t: VisitorType): string {
  switch (t) {
    case "first_time":
      return "Her for første gang";
    case "returning":
      return "Har vært her noen ganger";
    case "new_to_area":
      return "Ny i området";
    case "member":
      return "Allerede med i menigheten";
    case "other":
      return "Annet";
  }
}

export function isStatus(v: unknown): v is ConnectionStatus {
  return typeof v === "string" && (STATUS_ORDER as string[]).includes(v);
}

export function isVisitorType(v: unknown): v is VisitorType {
  return typeof v === "string" && (VISITOR_TYPES as string[]).includes(v);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s()-]{4,19}$/;

/** A cleaned, validated card ready to insert — or a snake_case error code. */
export type CleanConnection = {
  name: string;
  email: string | null;
  phone: string | null;
  visitor_type: VisitorType | null;
  interests: string[];
  message: string;
};

/**
 * Validate + normalise a public submission. The rules are deliberately strict
 * because this endpoint is unauthenticated:
 *  - a name (2–120 chars) is required,
 *  - at least one reachable contact (valid email OR phone),
 *  - explicit GDPR consent must be ticked,
 *  - message capped, interests filtered to the church's offered keys.
 */
export function validateConnection(
  input: ConnectInput,
  offeredInterestKeys: string[],
): { ok: true; value: CleanConnection } | { ok: false; error: string } {
  const name = (input.name ?? "").trim();
  if (name.length < 2 || name.length > 120) return { ok: false, error: "invalid_name" };

  if (input.consent !== true) return { ok: false, error: "consent_required" };

  const email = (input.email ?? "").trim().toLowerCase() || null;
  const phone = (input.phone ?? "").trim() || null;
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "invalid_email" };
  if (phone && !PHONE_RE.test(phone)) return { ok: false, error: "invalid_phone" };
  if (!email && !phone) return { ok: false, error: "contact_required" };

  const visitor_type = isVisitorType(input.visitorType) ? input.visitorType : null;

  const offered = new Set(offeredInterestKeys);
  const interests = Array.isArray(input.interests)
    ? [...new Set(input.interests.filter((k) => typeof k === "string" && offered.has(k)))]
    : [];

  const message = (input.message ?? "").trim().slice(0, 2000);

  return { ok: true, value: { name, email, phone, visitor_type, interests, message } };
}
