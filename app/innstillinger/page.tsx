"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

import { api, errorText } from "@/lib/client/api";
import { shareBase } from "@/lib/client/base";
import { useChurch } from "@/lib/client/useChurch";
import AdminShell from "@/app/components/AdminShell";
import type { Interest, WelcomeSettings } from "@/lib/types";

type Member = { userId: string; email: string | null; role: "admin" | "follower" };

function slugifyKey(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[æå]/g, "a")
      .replace(/ø/g, "o")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || `valg-${Math.abs(hash(label)) % 1000}`
  );
}
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

export default function SettingsPage() {
  const { me, loading, membership, select } = useChurch();
  const churchId = membership?.churchId ?? null;
  const slug = membership?.churchSlug ?? "";
  const isAdmin = membership?.role === "admin";

  const [settings, setSettings] = useState<WelcomeSettings | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const base = shareBase();
  const formUrl = slug ? `${base}/velkommen/${slug}` : "";

  const load = useCallback(async () => {
    if (!churchId) return;
    const [s, m] = await Promise.all([
      api.get<{ settings: WelcomeSettings }>(`/api/settings?churchId=${churchId}`),
      api.get<{ members: Member[] }>(`/api/members?churchId=${churchId}`),
    ]);
    setSettings(s.settings);
    setMembers(m.members);
  }, [churchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!formUrl) return;
    QRCode.toDataURL(formUrl, {
      width: 480,
      margin: 1,
      color: { dark: "#11141b", light: "#faf7f0" },
    }).then(setQr);
  }, [formUrl]);

  if (loading) return null;
  if (!me || me.memberships.length === 0) {
    return (
      <AdminShell me={me} selectedChurchId={churchId} onSelectChurch={select}>
        <p className="empty">Opprett en menighet på forsiden først.</p>
      </AdminShell>
    );
  }

  function set<K extends keyof WelcomeSettings>(key: K, value: WelcomeSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  async function save() {
    if (!settings || !churchId) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.put("/api/settings", {
        churchId,
        formEnabled: settings.formEnabled,
        headline: settings.headline,
        intro: settings.intro,
        askPhone: settings.askPhone,
        askVisitorType: settings.askVisitorType,
        interests: settings.interests,
        thankYou: settings.thankYou,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell me={me} selectedChurchId={churchId} onSelectChurch={select}>
      <h1 className="pagetitle">Skjema og deling</h1>

      <div className="card">
        <h2>QR-kode</h2>
        <p className="hint">
          Skriv ut og heng opp, eller vis på storskjermen. Den peker til
          velkomstlappen for menigheten din.
        </p>
        {qr && (
          <div className="wl-qrbox">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR-kode til velkomstskjemaet" width={240} height={240} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="btn btn-sm" href={qr} download={`velkommen-${slug}.png`}>
                Last ned QR
              </a>
              <a
                className="btn btn-sm btn-ghost"
                href={`${base}/skjerm/${slug}`}
                target="_blank"
                rel="noreferrer"
              >
                Åpne storskjerm
              </a>
            </div>
            <code className="wl-url">{formUrl}</code>
          </div>
        )}
      </div>

      {settings && (
        <fieldset className="wl-fieldset" disabled={!isAdmin}>
          <div className="card">
            <h2>Velkomstskjemaet</h2>
            {!isAdmin && (
              <p className="hint">Bare administratorer kan endre skjemaet.</p>
            )}
            <label className="wl-consent">
              <input
                type="checkbox"
                checked={settings.formEnabled}
                onChange={(e) => set("formEnabled", e.target.checked)}
              />
              <span>Skjemaet er åpent for nye besøkende</span>
            </label>

            <div className="field">
              <label htmlFor="headline">Overskrift</label>
              <input
                id="headline"
                value={settings.headline}
                maxLength={120}
                onChange={(e) => set("headline", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="intro">Introtekst</label>
              <textarea
                id="intro"
                value={settings.intro}
                maxLength={1000}
                onChange={(e) => set("intro", e.target.value)}
              />
            </div>
            <label className="wl-consent">
              <input
                type="checkbox"
                checked={settings.askPhone}
                onChange={(e) => set("askPhone", e.target.checked)}
              />
              <span>Spør om telefonnummer</span>
            </label>
            <label className="wl-consent">
              <input
                type="checkbox"
                checked={settings.askVisitorType}
                onChange={(e) => set("askVisitorType", e.target.checked)}
              />
              <span>Spør hvor godt de kjenner menigheten</span>
            </label>

            <div className="field">
              <label>Interesser å huke av</label>
              <InterestEditor
                interests={settings.interests}
                onChange={(next) => set("interests", next)}
              />
            </div>

            <div className="field">
              <label htmlFor="thankyou">Takke-melding etter innsending</label>
              <textarea
                id="thankyou"
                value={settings.thankYou}
                maxLength={1000}
                onChange={(e) => set("thankYou", e.target.value)}
              />
            </div>

            {error && <p className="error-text">{error}</p>}
            {isAdmin && (
              <button className="btn" disabled={busy} onClick={save}>
                {busy ? "Lagrer …" : saved ? "Lagret ✓" : "Lagre skjema"}
              </button>
            )}
          </div>
        </fieldset>
      )}

      <Team
        churchId={churchId}
        members={members}
        isAdmin={!!isAdmin}
        onChanged={load}
      />
    </AdminShell>
  );
}

function InterestEditor({
  interests,
  onChange,
}: {
  interests: Interest[];
  onChange: (next: Interest[]) => void;
}) {
  const [adding, setAdding] = useState("");
  return (
    <div className="wl-interest-editor">
      {interests.map((it, i) => (
        <div key={it.key} className="wl-interest-row">
          <input
            value={it.label}
            maxLength={80}
            onChange={(e) => {
              const next = [...interests];
              next[i] = { ...it, label: e.target.value };
              onChange(next);
            }}
          />
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => onChange(interests.filter((_, j) => j !== i))}
          >
            Fjern
          </button>
        </div>
      ))}
      <div className="wl-interest-row">
        <input
          value={adding}
          maxLength={80}
          placeholder="Legg til et alternativ …"
          onChange={(e) => setAdding(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-sm"
          disabled={!adding.trim() || interests.length >= 12}
          onClick={() => {
            const label = adding.trim();
            const key = slugifyKey(label);
            if (!interests.some((x) => x.key === key)) {
              onChange([...interests, { key, label }]);
            }
            setAdding("");
          }}
        >
          Legg til
        </button>
      </div>
    </div>
  );
}

function Team({
  churchId,
  members,
  isAdmin,
  onChanged,
}: {
  churchId: string | null;
  members: Member[];
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "follower">("follower");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!churchId || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/members", { churchId, email: email.trim(), role });
      setEmail("");
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Oppfølgings-team</h2>
      {members.map((m) => (
        <div className="card-row" key={m.userId}>
          <span>{m.email ?? m.userId}</span>
          <span className="badge badge-dim">
            {m.role === "admin" ? "Administrator" : "Følger opp"}
          </span>
        </div>
      ))}
      {isAdmin ? (
        <form onSubmit={invite} style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="invite-email">Inviter på e-post</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kollega@menigheten.no"
            />
          </div>
          <div className="field">
            <label htmlFor="invite-role">Rolle</label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "follower")}
            >
              <option value="follower">Følger opp</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-sm" disabled={busy || !email.trim()}>
            {busy ? "Inviterer …" : "Inviter"}
          </button>
        </form>
      ) : (
        <p className="hint">Bare administratorer kan invitere flere.</p>
      )}
    </div>
  );
}
