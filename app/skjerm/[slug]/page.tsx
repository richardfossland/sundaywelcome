import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import {
  createPublicServiceClient,
  createServiceClient,
} from "@/lib/supabase/service";

// The foyer board — open this URL fullscreen on a TV/tablet by the entrance.
export const dynamic = "force-dynamic";

export default async function WelcomeScreen({
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
    .select("headline, intro, form_enabled")
    .eq("church_id", church.id as string)
    .maybeSingle();

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || `${proto}://${host}`;
  const formUrl = `${base}/velkommen/${slug}`;

  const headline = (s?.headline as string) ?? "Velkommen!";
  const intro =
    (s?.intro as string) ?? "Er du ny hos oss? Skann koden og si hei.";
  const enabled = s?.form_enabled !== false;

  const qr = enabled
    ? await QRCode.toDataURL(formUrl, {
        width: 560,
        margin: 1,
        color: { dark: "#11141b", light: "#faf7f0" },
      })
    : null;

  return (
    <div className="wl-screen">
      <p className="wl-screen-church">{church.name as string}</p>
      <h1 className="wl-screen-title">{headline}</h1>
      <p className="wl-screen-intro">{intro}</p>
      {qr && (
        <div className="wl-screen-qr">
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data-URL QR; next/image can't optimise it */}
          <img src={qr} alt="" width={560} height={560} />
          <p className="wl-screen-cta">Skann for å si hei 👋</p>
        </div>
      )}
    </div>
  );
}
