// Domain types shared across server (API routes) and client (admin UI).

/** Workflow state of a newcomer card. `new` → picked up → `done`/`archived`. */
export type ConnectionStatus =
  | "new"
  | "assigned"
  | "contacted"
  | "done"
  | "archived";

/** How the visitor describes themselves on the connect card. */
export type VisitorType =
  | "first_time"
  | "returning"
  | "new_to_area"
  | "member"
  | "other";

/** An interest checkbox offered on the form (configurable per church). */
export type Interest = { key: string; label: string };

/** A newcomer card as the admin inbox sees it. */
export type Connection = {
  id: string;
  churchId: string;
  name: string;
  email: string | null;
  phone: string | null;
  visitorType: VisitorType | null;
  interests: string[];
  message: string;
  status: ConnectionStatus;
  assignedTo: string | null;
  assignedToEmail: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
};

/** A follow-up note / activity entry on a card. */
export type Note = {
  id: string;
  connectionId: string;
  authorId: string | null;
  authorEmail: string | null;
  body: string;
  createdAt: string;
};

/** Per-church configuration of the public connect form. */
export type WelcomeSettings = {
  churchId: string;
  formEnabled: boolean;
  headline: string;
  intro: string;
  askPhone: boolean;
  askVisitorType: boolean;
  interests: Interest[];
  thankYou: string;
  updatedAt: string;
};

/** The shape a newcomer submits from the public form. */
export type ConnectInput = {
  slug: string;
  name?: string;
  email?: string;
  phone?: string;
  visitorType?: string;
  interests?: string[];
  message?: string;
  consent?: boolean;
};
