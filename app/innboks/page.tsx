"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AdminShell from "@/app/components/AdminShell";
import { statusLabel } from "@/lib/connection";
import { api } from "@/lib/client/api";
import { useChurch } from "@/lib/client/useChurch";
import type { Connection, ConnectionStatus } from "@/lib/types";

type Filter = ConnectionStatus | "all";

const FILTERS: Filter[] = ["all", "new", "assigned", "contacted", "done", "archived"];

function badgeClass(s: ConnectionStatus): string {
  switch (s) {
    case "new":
      return "badge-warn";
    case "done":
      return "badge-ok";
    case "archived":
      return "badge-dim";
    default:
      return "";
  }
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "nå nettopp";
  if (mins < 60) return `${mins} min siden`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} t siden`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} d siden`;
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

export default function InboxPage() {
  const { me, loading, membership, select } = useChurch();
  const churchId = membership?.churchId ?? null;
  const [items, setItems] = useState<Connection[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    if (!churchId) return;
    setBusy(true);
    try {
      const data = await api.get<{ connections: Connection[]; counts: Record<string, number> }>(
        `/api/connections?churchId=${churchId}`,
      );
      setItems(data.connections);
      setCounts(data.counts);
    } finally {
      setBusy(false);
    }
  }, [churchId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return null;
  if (!me || me.memberships.length === 0) {
    return (
      <AdminShell me={me} selectedChurchId={churchId} onSelectChurch={select}>
        <p className="empty">Opprett en menighet på forsiden først.</p>
      </AdminShell>
    );
  }

  const shown = filter === "all" ? items : items.filter((c) => c.status === filter);
  const total = items.length;

  return (
    <AdminShell me={me} selectedChurchId={churchId} onSelectChurch={select}>
      <h1 className="pagetitle">Innboks</h1>

      <div className="tabs wl-filters">
        {FILTERS.map((f) => {
          const n = f === "all" ? total : (counts[f] ?? 0);
          return (
            <button
              key={f}
              className={`wl-filter ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Alle" : statusLabel(f)} <span className="wl-filter-n">{n}</span>
            </button>
          );
        })}
      </div>

      {busy && items.length === 0 ? (
        <div className="card">
          <div className="skel skel-row" />
          <div className="skel skel-row" />
        </div>
      ) : shown.length === 0 ? (
        <p className="empty">
          {total === 0
            ? "Ingen henvendelser ennå — del velkomstlappen på storskjermen, så dukker de opp her."
            : "Ingen i denne statusen."}
        </p>
      ) : (
        <div className="wl-list">
          {shown.map((c) => (
            <Link key={c.id} href={`/innboks/${c.id}`} className="card wl-row">
              <div className="wl-row-main">
                <div className="wl-row-top">
                  <strong>{c.name}</strong>
                  <span className={`badge ${badgeClass(c.status)}`}>
                    {statusLabel(c.status)}
                  </span>
                </div>
                <p className="hint" style={{ margin: "2px 0 0" }}>
                  {[c.email, c.phone].filter(Boolean).join(" · ") || "Ingen kontaktinfo"}
                  {c.interests.length > 0 && ` · ${c.interests.length} interesser`}
                </p>
                {c.message && <p className="wl-row-msg">{c.message}</p>}
              </div>
              <span className="wl-row-time">{relTime(c.createdAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
