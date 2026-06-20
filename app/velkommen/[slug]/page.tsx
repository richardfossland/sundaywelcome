import { notFound } from "next/navigation";

import { DEFAULT_INTERESTS } from "@/lib/connection";
import {
  createPublicServiceClient,
  createServiceClient,
} from "@/lib/supabase/service";
import type { Interest } from "@/lib/types";

import ConnectForm, { type PublicSettings } from "./ConnectForm";

// Per-church, always fresh — never statically cached across congregations.
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const pub = createPublicServiceClient();
  const { data: church } = await pub
    .from("church")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!church) notFound();

  const db = createServiceClient();
  const { data: s } = await db
    .from("settings")
    .select("form_enabled, headline, intro, ask_phone, ask_visitor_type, interests, thank_you")
    .eq("church_id", church.id as string)
    .maybeSingle();

  const settings: PublicSettings = {
    headline: (s?.headline as string) ?? "Velkommen!",
    intro:
      (s?.intro as string) ??
      "Så fint at du er her. Legg igjen navnet ditt, så tar vi kontakt.",
    askPhone: (s?.ask_phone as boolean) ?? true,
    askVisitorType: (s?.ask_visitor_type as boolean) ?? true,
    interests: ((s?.interests as Interest[] | null) ?? DEFAULT_INTERESTS),
    thankYou: (s?.thank_you as string) ?? "Takk! Vi tar kontakt med deg snart.",
  };

  if (s && s.form_enabled === false) {
    return (
      <div className="shell shell-narrow" style={{ paddingTop: "12vh", textAlign: "center" }}>
        <h1 className="brand" style={{ fontSize: "1.8rem" }}>
          {church.name as string}
        </h1>
        <div className="card">
          <p className="lede" style={{ margin: 0 }}>
            Velkomstskjemaet er ikke åpent akkurat nå. Ta gjerne kontakt med en
            av oss neste gang du er innom.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ConnectForm slug={slug} churchName={church.name as string} settings={settings} />
  );
}
