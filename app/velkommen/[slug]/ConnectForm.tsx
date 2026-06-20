"use client";

import { useState } from "react";

import { visitorTypeLabel } from "@/lib/connection";
import { api, errorText } from "@/lib/client/api";
import type { Interest, VisitorType } from "@/lib/types";

export type PublicSettings = {
  headline: string;
  intro: string;
  askPhone: boolean;
  askVisitorType: boolean;
  interests: Interest[];
  thankYou: string;
};

const VISITOR_TYPES: VisitorType[] = [
  "first_time",
  "returning",
  "new_to_area",
  "member",
  "other",
];

export default function ConnectForm({
  slug,
  churchName,
  settings,
}: {
  slug: string;
  churchName: string;
  settings: PublicSettings;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [visitorType, setVisitorType] = useState<VisitorType | "">("");
  const [interests, setInterests] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggleInterest(key: string) {
    setInterests((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/connect", {
        slug,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        visitorType: visitorType || undefined,
        interests,
        message: message.trim() || undefined,
        consent,
      });
      setDone(true);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="shell shell-narrow" style={{ paddingTop: "12vh", textAlign: "center" }}>
        <div className="wl-check" aria-hidden>
          ✓
        </div>
        <h1 className="brand" style={{ fontSize: "1.8rem", marginBottom: 6 }}>
          {churchName}
        </h1>
        <div className="card">
          <p className="lede" style={{ margin: 0 }}>
            {settings.thankYou}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="shell shell-narrow" style={{ paddingTop: "7vh" }}>
      <p className="wl-eyebrow">{churchName}</p>
      <h1 className="brand" style={{ fontSize: "2rem", marginBottom: 6 }}>
        {settings.headline}
      </h1>
      <p className="lede">{settings.intro}</p>

      <div className="card">
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="name">Navn</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              placeholder="Fornavn og etternavn"
            />
          </div>

          <div className="field">
            <label htmlFor="email">E-post</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="deg@eksempel.no"
            />
          </div>

          {settings.askPhone && (
            <div className="field">
              <label htmlFor="phone">Telefon</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="+47 …"
              />
            </div>
          )}
          <p className="hint" style={{ marginTop: -6 }}>
            Oppgi minst én av e-post eller telefon, så kan vi ta kontakt.
          </p>

          {settings.askVisitorType && (
            <div className="field">
              <label htmlFor="vtype">Hvor godt kjenner du oss?</label>
              <select
                id="vtype"
                value={visitorType}
                onChange={(e) => setVisitorType(e.target.value as VisitorType | "")}
              >
                <option value="">Velg …</option>
                {VISITOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {visitorTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {settings.interests.length > 0 && (
            <div className="field">
              <label>Jeg er interessert i …</label>
              <div className="wl-chips">
                {settings.interests.map((i) => (
                  <label
                    key={i.key}
                    className={`wl-chip ${interests.includes(i.key) ? "on" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={interests.includes(i.key)}
                      onChange={() => toggleInterest(i.key)}
                    />
                    {i.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="message">Melding (valgfritt)</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              placeholder="Noe du lurer på, eller vil vi skal vite?"
            />
          </div>

          <label className="wl-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Jeg samtykker til at {churchName} lagrer opplysningene for å ta
              kontakt med meg.
            </span>
          </label>

          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-block" disabled={busy || !consent}>
            {busy ? "Sender …" : "Si hei 👋"}
          </button>
        </form>
      </div>
    </div>
  );
}
