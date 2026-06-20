# SundayWelcome

Digital velkomstlapp + nykommer-oppfølging for menigheter —
`welcome.sundaysuite.app`. Norsk UI, engelsk kode. Next.js 16 App Router +
React 19 + TS, deployet via OpenNext til Cloudflare Workers. Data i **SundayPlans
Supabase-prosjekt** (SSO-utstederen): tenancy gjenbrukes fra
`public.church`/`public.church_member`, appen eier `welcome`-schemaet.

## Kommandoer
- `npm run check` — tsc + eslint + vitest (full gate, må være grønn)
- `npm run test:db` — Docker-Postgres: migrasjon ×2 (idempotens) + logikk-assertions
- `npm run cf:build && npm run cf:deploy` — deploy til Cloudflare

## Arkitektur
- **Offentlig velkomstlapp** (`/velkommen/[slug]`): uautentisert. Server-
  komponenten henter menighet + skjema-config; `ConnectForm` poster til
  `POST /api/connect`. Validering i `lib/connection.ts` (ren, enhetstestet):
  navn påkrevd, minst én kontakt (e-post ELLER telefon), eksplisitt
  GDPR-samtykke, interesser filtreres til menighetens tilbudte nøkler. Anon
  rører ALDRI Postgres — skrivet går via service-role i API-ruten.
- **Storskjerm** (`/skjerm/[slug]`): server-rendret «board» med server-generert
  QR (`qrcode.toDataURL`) som peker til velkomstlappen.
- **Admin** (norske ruter, mobil-først): Sunday Account SSO via `@supabase/ssr`
  på `.sundaysuite.app`. Autorisasjon slås ALLTID opp server-side
  (`lib/server/auth.ts`) mot `welcome.member` — aldri fra body. Roller:
  `admin` (styrer skjema + team + sletting) og `follower` (følger opp innboks).
- **API**: alle skriv via route handlers med service-role. RLS på alle
  `welcome`-tabeller uten policies (suite-konvensjonen).

## Datamodell (`welcome`-schema)
- `member` (church_id, user_id, role) — hvem som følger opp.
- `settings` (church_id PK) — skjema-config: overskrift/intro/felter/interesser/
  takke-melding/`form_enabled`.
- `connection` — nykommer-kortet (navn, e-post/telefon, visitor_type,
  interests[], melding, status, assigned_to, consent_at). Constraint:
  minst én kontakt; status/visitor_type sjekkes.
- `note` — oppfølgings-notater (cascade med connection).

## Deploy-feller (lært av søsterappene)
1. `welcome`-schemaet MÅ eksponeres i Supabase Dashboard → Settings → API →
   Exposed schemas (kan ikke settes via SQL); grants ligger i migrasjonen.
2. Worker-secret: `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`.
   Build-env: `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` (Plan-prosjektet) +
   `NEXT_PUBLIC_COOKIE_DOMAIN=.sundaysuite.app` + `NEXT_PUBLIC_BASE_URL`.
3. `app_grant`-constrainten i SundayPlan trenger `'welcome'` når SSO-grants
   skrus på (egen Plan-migrasjon, ikke blokkerende).
4. Next 16: bruk Edge `middleware.ts`, ALDRI `proxy.ts` (Node-runtime brekker
   OpenNext/Cloudflare-deploy).
