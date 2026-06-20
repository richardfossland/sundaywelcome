"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  STATUS_ORDER,
  statusLabel,
  visitorTypeLabel,
} from "@/lib/connection";
import { api, errorText } from "@/lib/client/api";
import { useChurch } from "@/lib/client/useChurch";
import type { Connection, ConnectionStatus, Note } from "@/lib/types";

type Member = { userId: string; email: string | null; role: "admin" | "follower" };

export default function ConnectionDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { me } = useChurch();

  const [conn, setConn] = useState<Connection | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ connection: Connection; notes: Note[] }>(
        `/api/connections/${id}`,
      );
      setConn(data.connection);
      setNotes(data.notes);
      const m = await api.get<{ members: Member[] }>(
        `/api/members?churchId=${data.connection.churchId}`,
      );
      setMembers(m.members);
    } catch (err) {
      setError(errorText(err));
      setNotFound(true);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const isAdmin =
    me?.memberships.find((x) => x.churchId === conn?.churchId)?.role === "admin";

  async function patch(body: Record<string, unknown>) {
    if (!conn) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/connections/${conn.id}`, body);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!conn || !noteText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/connections/${conn.id}/notes`, { body: noteText.trim() });
      setNoteText("");
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!conn) return;
    if (!confirm("Slette denne henvendelsen permanent? Dette kan ikke angres.")) return;
    setBusy(true);
    try {
      await api.del(`/api/connections/${conn.id}`);
      router.push("/innboks");
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="shell">
        <Link href="/innboks" className="btn btn-sm btn-ghost">
          ← Innboks
        </Link>
        <p className="empty">{error ?? "Fant ikke henvendelsen."}</p>
      </div>
    );
  }
  if (!conn) return null;

  return (
    <div className="shell">
      <Link href="/innboks" className="btn btn-sm btn-ghost">
        ← Innboks
      </Link>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="wl-row-top">
          <h1 style={{ fontFamily: "var(--display)", fontSize: "1.6rem" }}>{conn.name}</h1>
          <span className="badge">{statusLabel(conn.status)}</span>
        </div>
        <div className="wl-contact">
          {conn.email && (
            <a href={`mailto:${conn.email}`} className="wl-contact-link">
              ✉ {conn.email}
            </a>
          )}
          {conn.phone && (
            <a href={`tel:${conn.phone}`} className="wl-contact-link">
              ☎ {conn.phone}
            </a>
          )}
        </div>
        {conn.visitorType && (
          <p className="hint">{visitorTypeLabel(conn.visitorType)}</p>
        )}
        {conn.interests.length > 0 && (
          <div className="wl-chips" style={{ marginTop: 8 }}>
            {conn.interests.map((k) => (
              <span key={k} className="wl-chip on" style={{ cursor: "default" }}>
                {k}
              </span>
            ))}
          </div>
        )}
        {conn.message && <p className="wl-msg">{conn.message}</p>}
        <p className="hint" style={{ marginTop: 10 }}>
          Mottatt {new Date(conn.createdAt).toLocaleString("nb-NO")}
        </p>
      </div>

      <div className="card">
        <h2>Oppfølging</h2>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={conn.status}
            disabled={busy}
            onChange={(e) => patch({ status: e.target.value as ConnectionStatus })}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="assignee">Ansvarlig</label>
          <select
            id="assignee"
            value={conn.assignedTo ?? ""}
            disabled={busy}
            onChange={(e) =>
              patch({ assignedTo: e.target.value === "" ? null : e.target.value })
            }
          >
            <option value="">Ingen tildelt</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.email ?? m.userId}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <h2>Notater</h2>
        {notes.length === 0 ? (
          <p className="empty">Ingen notater ennå.</p>
        ) : (
          <ul className="wl-notes">
            {notes.map((n) => (
              <li key={n.id} className="wl-note">
                <p style={{ whiteSpace: "pre-wrap" }}>{n.body}</p>
                <p className="hint">
                  {n.authorEmail ?? "Noen"} · {new Date(n.createdAt).toLocaleString("nb-NO")}
                </p>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addNote} style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="note">Nytt notat</label>
            <textarea
              id="note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              maxLength={4000}
              placeholder="F.eks. «Ringte, avtalte kaffe torsdag»"
            />
          </div>
          <button className="btn btn-sm" disabled={busy || !noteText.trim()}>
            Legg til notat
          </button>
        </form>
      </div>

      {isAdmin && (
        <button className="btn btn-ghost btn-sm btn-danger" disabled={busy} onClick={remove}>
          Slett henvendelsen
        </button>
      )}
    </div>
  );
}
