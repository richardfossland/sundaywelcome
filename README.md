# SundayWelcome

Den digitale velkomstlappen for menigheter — `welcome.sundaysuite.app`.

Nye besøkende skanner en QR-kode på storskjermen (eller åpner en lenke), legger
igjen et «hei» med navn og kontaktinfo, og havner rett i oppfølgings-innboksen
til menigheten. Ingen som besøker dere for første gang forsvinner ut igjen
uoppfulgt.

Plan og Folk dekker dem som allerede er med og har en rolle. SundayWelcome
fanger **nykommeren som ikke er i systemet ennå** og ruter dem inn i oppfølging.

## Slik henger det sammen

- **Offentlig** (`/velkommen/[slug]`): selve velkomstlappen. Uten innlogging.
  Sender til `POST /api/connect`, som validerer og skriver via service-role —
  anonyme brukere rører aldri databasen direkte.
- **Storskjerm** (`/skjerm/[slug]`): et varmt velkomst-«board» med QR-kode, ment
  for en TV/nettbrett i inngangspartiet.
- **Admin** (norske ruter, mobil-først): innboks med status-flyt
  (ny → tildelt → kontaktet → fullført / arkivert), ansvarlig, og notater.
  Innlogging via Sunday Account (Supabase magic link / Google på
  `.sundaysuite.app`). Autorisasjon slås ALLTID opp server-side
  (`lib/server/auth.ts`).

## Fler-leietaker

Bor i **SundayPlans Supabase-prosjekt** (SSO-utstederen). Tenancy gjenbrukes fra
`public.church` / `public.church_member`; appen eier `welcome`-schemaet, og hver
rad har `church_id`. Hver menighet ser bare sine egne henvendelser.

## Kommandoer

- `npm run check` — tsc + eslint + vitest (full gate, må være grønn)
- `npm run test:db` — Docker-Postgres: migrasjon ×2 (idempotens) + logikk-assertions
- `npm run cf:build && npm run cf:deploy` — deploy til Cloudflare

## Oppsett / deploy

1. Kjør `supabase/migrations/*.sql` i SundayPlan-prosjektet.
2. **Eksponer `welcome`-schemaet** i Supabase Dashboard → Settings → API →
   Exposed schemas (kan ikke settes via SQL).
3. Build-env: `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` (Plan-prosjektet),
   `NEXT_PUBLIC_COOKIE_DOMAIN=.sundaysuite.app`,
   `NEXT_PUBLIC_BASE_URL=https://welcome.sundaysuite.app`.
4. Worker-secret: `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`.
5. (Når SSO-grants skrus på) utvid `app_grant`-constrainten i SundayPlan til å
   inkludere `'welcome'`.
