// Pure DB-row → API-shape mappers (snake_case → camelCase). No side effects, so
// both the list and detail routes share them.

import type { Connection, Note } from "@/lib/types";

type Row = Record<string, unknown>;

export function rowToConnection(row: Row, emails: Map<string, string | null>): Connection {
  const assignedTo = (row.assigned_to as string | null) ?? null;
  return {
    id: row.id as string,
    churchId: row.church_id as string,
    name: row.name as string,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    visitorType: (row.visitor_type as Connection["visitorType"]) ?? null,
    interests: (row.interests as string[] | null) ?? [],
    message: (row.message as string | null) ?? "",
    status: row.status as Connection["status"],
    assignedTo,
    assignedToEmail: assignedTo ? (emails.get(assignedTo) ?? null) : null,
    source: (row.source as string | null) ?? "web",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function rowToNote(row: Row, emails: Map<string, string | null>): Note {
  const authorId = (row.author_id as string | null) ?? null;
  return {
    id: row.id as string,
    connectionId: row.connection_id as string,
    authorId,
    authorEmail: authorId ? (emails.get(authorId) ?? null) : null,
    body: row.body as string,
    createdAt: row.created_at as string,
  };
}
