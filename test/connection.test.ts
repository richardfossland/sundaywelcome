import { describe, expect, it } from "vitest";

import {
  isStatus,
  STATUS_ORDER,
  validateConnection,
} from "@/lib/connection";
import type { ConnectInput } from "@/lib/types";

const OFFERED = ["smaagruppe", "barn", "nyhetsbrev"];

function base(over: Partial<ConnectInput> = {}): ConnectInput {
  return { slug: "testkirken", name: "Kari Nordmann", email: "kari@test.no", consent: true, ...over };
}

describe("validateConnection", () => {
  it("accepts a well-formed submission and normalises it", () => {
    const r = validateConnection(
      base({ email: "  KARI@Test.NO ", message: "  hei  ", interests: ["barn", "ukjent"] }),
      OFFERED,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.email).toBe("kari@test.no"); // trimmed + lowercased
    expect(r.value.message).toBe("hei");
    expect(r.value.interests).toEqual(["barn"]); // unknown key dropped
  });

  it("requires a name of 2–120 chars", () => {
    expect(validateConnection(base({ name: "A" }), OFFERED)).toMatchObject({
      ok: false,
      error: "invalid_name",
    });
  });

  it("requires explicit consent", () => {
    expect(validateConnection(base({ consent: false }), OFFERED)).toMatchObject({
      ok: false,
      error: "consent_required",
    });
  });

  it("requires at least one contact method", () => {
    expect(
      validateConnection(base({ email: undefined, phone: undefined }), OFFERED),
    ).toMatchObject({ ok: false, error: "contact_required" });
  });

  it("accepts phone-only", () => {
    const r = validateConnection(
      base({ email: undefined, phone: "+47 922 33 444" }),
      OFFERED,
    );
    expect(r.ok).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(validateConnection(base({ email: "nope" }), OFFERED)).toMatchObject({
      ok: false,
      error: "invalid_email",
    });
  });

  it("rejects a malformed phone", () => {
    expect(
      validateConnection(base({ email: undefined, phone: "abc" }), OFFERED),
    ).toMatchObject({ ok: false, error: "invalid_phone" });
  });

  it("keeps a known visitor type and nulls an unknown one", () => {
    const ok = validateConnection(base({ visitorType: "first_time" }), OFFERED);
    expect(ok.ok && ok.value.visitor_type).toBe("first_time");
    const bad = validateConnection(base({ visitorType: "garbage" }), OFFERED);
    expect(bad.ok && bad.value.visitor_type).toBe(null);
  });

  it("dedupes interests and only keeps offered keys", () => {
    const r = validateConnection(
      base({ interests: ["barn", "barn", "smaagruppe", "nope"] }),
      OFFERED,
    );
    expect(r.ok && r.value.interests).toEqual(["barn", "smaagruppe"]);
  });

  it("caps the message at 2000 chars", () => {
    const r = validateConnection(base({ message: "x".repeat(5000) }), OFFERED);
    expect(r.ok && r.value.message.length).toBe(2000);
  });
});

describe("isStatus", () => {
  it("recognises every workflow status and rejects junk", () => {
    for (const s of STATUS_ORDER) expect(isStatus(s)).toBe(true);
    expect(isStatus("bogus")).toBe(false);
    expect(isStatus(undefined)).toBe(false);
  });
});
