-- SundayWelcome logic assertions. Run by scripts/test-db.sh after the migration.
-- Style: one DO block per scenario; `assert` + RAISE NOTICE 'PASS: …'.
-- Most domain logic lives in the TS layer (validateConnection); these prove the
-- DB-level guarantees: tenancy isolation, the contact/status/visitor
-- constraints, defaults, and cascade behaviour.

set search_path = welcome, public;

-- Fixtures ────────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'admin@test.no'),
  ('00000000-0000-0000-0000-000000000002', 'follower@test.no');
insert into public.church (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Testkirken', 'testkirken'),
  ('10000000-0000-0000-0000-000000000002', 'Annenkirken', 'annenkirken');
insert into welcome.member (church_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'follower');
insert into welcome.settings (church_id) values
  ('10000000-0000-0000-0000-000000000001');

-- 1. Settings seed: default interests is a non-empty jsonb array ───────────────
do $$
declare n int;
begin
  select jsonb_array_length(interests) into n
    from welcome.settings where church_id = '10000000-0000-0000-0000-000000000001';
  assert n >= 1, format('default interests should be a non-empty array, got %s', n);
  assert (select form_enabled from welcome.settings
            where church_id = '10000000-0000-0000-0000-000000000001') is true,
    'form should default to enabled';
  raise notice 'PASS: settings defaults (interests + form_enabled)';
end $$;

-- 2. Connection happy path + defaults ─────────────────────────────────────────
do $$
declare v_id uuid; v_status text;
begin
  insert into welcome.connection (church_id, name, email)
    values ('10000000-0000-0000-0000-000000000001', 'Kari Nordmann', 'kari@test.no')
    returning id, status into v_id, v_status;
  assert v_status = 'new', format('status should default to new, got %s', v_status);
  assert (select consent_at from welcome.connection where id = v_id) is not null,
    'consent_at should be stamped';
  raise notice 'PASS: connection insert defaults (status=new, consent stamped)';
end $$;

-- 3. Contact constraint: neither email nor phone is rejected ───────────────────
do $$
declare ok boolean := false;
begin
  begin
    insert into welcome.connection (church_id, name)
      values ('10000000-0000-0000-0000-000000000001', 'Ingen Kontakt');
  exception when check_violation then
    ok := true;
  end;
  assert ok, 'a connection with no email AND no phone must be rejected';
  raise notice 'PASS: connection_has_contact constraint';
end $$;

-- 4. Invalid status / visitor_type rejected ───────────────────────────────────
do $$
declare ok boolean := false;
begin
  begin
    insert into welcome.connection (church_id, name, phone, status)
      values ('10000000-0000-0000-0000-000000000001', 'X', '12345678', 'bogus');
  exception when check_violation then ok := true; end;
  assert ok, 'invalid status must be rejected';

  ok := false;
  begin
    insert into welcome.connection (church_id, name, phone, visitor_type)
      values ('10000000-0000-0000-0000-000000000001', 'X', '12345678', 'bogus');
  exception when check_violation then ok := true; end;
  assert ok, 'invalid visitor_type must be rejected';
  raise notice 'PASS: status + visitor_type check constraints';
end $$;

-- 5. Tenancy isolation: filtering by church_id separates congregations ─────────
do $$
declare n1 int; n2 int;
begin
  insert into welcome.connection (church_id, name, phone)
    values ('10000000-0000-0000-0000-000000000002', 'Annen Person', '99887766');
  select count(*) into n1 from welcome.connection
    where church_id = '10000000-0000-0000-0000-000000000001';
  select count(*) into n2 from welcome.connection
    where church_id = '10000000-0000-0000-0000-000000000002';
  assert n1 = 1, format('church 1 should see exactly its own 1 card, got %s', n1);
  assert n2 = 1, format('church 2 should see exactly its own 1 card, got %s', n2);
  raise notice 'PASS: per-church (church_id) tenancy isolation';
end $$;

-- 6. Notes cascade with their connection; connections cascade with the church ─
do $$
declare v_conn uuid; remaining int;
begin
  select id into v_conn from welcome.connection
    where church_id = '10000000-0000-0000-0000-000000000001' limit 1;
  insert into welcome.note (connection_id, church_id, author_id, body)
    values (v_conn, '10000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002', 'Ringte, avtalte kaffe');

  delete from welcome.connection where id = v_conn;
  select count(*) into remaining from welcome.note where connection_id = v_conn;
  assert remaining = 0, 'deleting a connection must cascade-delete its notes';

  delete from public.church where id = '10000000-0000-0000-0000-000000000002';
  select count(*) into remaining from welcome.connection
    where church_id = '10000000-0000-0000-0000-000000000002';
  assert remaining = 0, 'deleting a church must cascade-delete its connections';
  raise notice 'PASS: note + connection cascade deletes';
end $$;

-- 7. RLS is enabled on every welcome table (suite security convention) ─────────
do $$
declare unprotected int;
begin
  select count(*) into unprotected
    from pg_tables
    where schemaname = 'welcome' and rowsecurity = false;
  assert unprotected = 0,
    format('every welcome table must have RLS enabled, %s without', unprotected);
  raise notice 'PASS: RLS enabled on all welcome tables';
end $$;

select 'ALL WELCOME-LOGIC TESTS PASSED' as result;
