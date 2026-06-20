"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AdminShell from "@/app/components/AdminShell";
import { statusLabel } from "@/lib/connection";
import { api, errorText } from "@/lib/client/api";
import { shareBase } from "@/lib/client/base";
import { useChurch } from "@/lib/client/useChurch";
import { createClient } from "@/lib/supabase/client";
import type { ConnectionStatus } from "@/lib/types";

export default function Dashboard() {
  const { me, loading, membership, select, refresh } = useChurch();
  const churchId = membership?.churchId ?? null;
  const slug = membership?.churchSlug ?? "";
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!churchId) return;
    try {
      const data = await api.get<{ counts: Record<string, number> }>(
        `/api/connections?churchId=${churchId}`,
      );
      setCounts(data.counts);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [churchId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return null;
  if (!me || me.memberships.length === 0) return <Onboarding onCreated={refresh} />;

  const open = (counts.new ?? 0) + (counts.assigned ?? 0) + (counts.contacted ?? 0);
  const newCount = counts.new ?? 0;

  return (
    <AdminShell me={me} selectedChurchId={churchId} onSelectChurch={select}>
      <h1 className="pagetitle">Hjem</h1>

      {loadError && (
        <p className="inline-error" role="status">
          Klarte ikke å hente status — prøver igjen automatisk.
        </p>
      )}

      <Link href="/innboks" className="card wl-stat" style={{ display: "block" }}>
        <div className="wl-stat-num">{newCount}</div>
        <div>
          <strong>nye henvendelser</strong>
          <p className="hint" style={{ margin: 0 }}>
            {open} åpne totalt — trykk for å følge opp i innboksen.
          </p>
        </div>
      </Link>

      <ShareCard slug={slug} />

      <div className="card">
        <h2>Status</h2>
        {(["new", "assigned", "contacted", "done", "archived"] as ConnectionStatus[]).map(
          (s) => (
            <div className="card-row" key={s}>
              <span>{statusLabel(s)}</span>
              <span className="badge badge-dim">{counts[s] ?? 0}</span>
            </div>
          ),
        )}
      </div>

      <SignOutButton />
    </AdminShell>
  );
}

function ShareCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const base = shareBase();
  const formUrl = `${base}/velkommen/${slug}`;
  const screenUrl = `${base}/skjerm/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — the link is shown below to copy by hand.
    }
  }

  return (
    <div className="card">
      <h2>Del velkomstlappen</h2>
      <p className="hint">
        Nye besøkende skanner en QR-kode eller åpner lenken, sier hei, og havner
        rett i innboksen din.
      </p>
      <code className="wl-url">{formUrl}</code>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button className="btn btn-sm" onClick={copy}>
          {copied ? "Kopiert ✓" : "Kopier lenke"}
        </button>
        <a className="btn btn-sm btn-ghost" href={screenUrl} target="_blank" rel="noreferrer">
          Åpne storskjerm
        </a>
        <Link className="btn btn-sm btn-ghost" href="/innstillinger">
          QR-kode og skjema
        </Link>
      </div>
    </div>
  );
}

function Onboarding({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/churches", { name: name.trim() });
      onCreated();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div className="shell shell-narrow" style={{ paddingTop: "10vh" }}>
      <h1 className="brand" style={{ fontSize: "2rem", marginBottom: 6 }}>
        Sunday<em>Welcome</em>
      </h1>
      <p className="lede">
        Velkommen! Opprett menigheten din, så kan nye besøkende si hei på under
        fem minutter.
      </p>
      <div className="card">
        <form onSubmit={create}>
          <div className="field">
            <label htmlFor="church-name">Menighetens navn</label>
            <input
              id="church-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Betania Fauske"
              required
              minLength={2}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-block" disabled={busy}>
            {busy ? "Oppretter …" : "Opprett menighet"}
          </button>
        </form>
      </div>
      <SignOutButton />
    </div>
  );
}

function SignOutButton() {
  return (
    <button
      className="btn btn-ghost btn-sm"
      style={{ marginTop: 8 }}
      onClick={async () => {
        await createClient().auth.signOut();
        window.location.href = "/login";
      }}
    >
      Logg ut
    </button>
  );
}
