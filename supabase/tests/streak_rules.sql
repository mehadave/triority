-- Behaviour tests for the schema. Each block raises on failure.
-- Run: psql -v ON_ERROR_STOP=1 -f local_auth_stub.sql -f ../migrations/*.sql -f streak_rules.sql

\set a '''00000000-0000-0000-0000-00000000000a'''
\set b '''00000000-0000-0000-0000-00000000000b'''
\set c '''00000000-0000-0000-0000-00000000000c'''
\set d '''00000000-0000-0000-0000-00000000000d'''

insert into auth.users (id, email) values
  (:a, 'a@example.com'), (:b, 'b@example.com'), (:c, 'c@example.com'), (:d, 'd@example.com');

create or replace function pg_temp.won_tasks() returns jsonb language sql as $$
  select '[{"text":"one","done":true,"doneAt":null},{"text":"two","done":true,"doneAt":null},{"text":"three","done":true,"doneAt":null}]'::jsonb
$$;
create or replace function pg_temp.open_tasks() returns jsonb language sql as $$
  select '[{"text":"one","done":false,"doneAt":null},{"text":"two","done":false,"doneAt":null},{"text":"three","done":false,"doneAt":null}]'::jsonb
$$;
-- Won entries for the n days ending `last_offset` days before today.
create or replace function pg_temp.history(n int, last_offset int) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('date', (current_date - last_offset - i)::text, 'tasks', pg_temp.won_tasks()))
    from generate_series(0, n - 1) as i
$$;
create or replace function pg_temp.expect(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- The tests use the server's UTC date as "today".
set timezone = 'UTC';

-- ---------------------------------------------------------------- user A
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :a, true);

insert into public.day_entries (user_id, date, tasks) values (:a, current_date, pg_temp.open_tasks());
select pg_temp.expect(true, 'can create today''s entry');

do $$ begin
  insert into public.day_entries (user_id, date, tasks) values (auth.uid(), current_date - 1, pg_temp.open_tasks());
  raise exception 'FAILED: wrote a past day';
exception when sqlstate '22023' then raise notice 'ok - past days are rejected';
end $$;

do $$ begin
  insert into public.day_entries (user_id, date, tasks)
  values (auth.uid(), current_date + 1, '[{"text":"only one","done":false,"doneAt":null}]');
  raise exception 'FAILED: accepted two-task day';
exception when check_violation then raise notice 'ok - must have exactly three tasks';
end $$;

do $$ begin
  insert into public.day_entries (user_id, date, tasks)
  values (auth.uid(), current_date + 1, jsonb_set(pg_temp.open_tasks(), '{0,text}', to_jsonb(repeat('x', 81))));
  raise exception 'FAILED: accepted 81 chars';
exception when check_violation then raise notice 'ok - task text is capped at 80';
end $$;

do $$ begin
  insert into public.day_entries (user_id, date, tasks) values (auth.uid(), current_date, pg_temp.open_tasks());
  raise exception 'FAILED: duplicate day';
exception when unique_violation then raise notice 'ok - one entry per user per date';
end $$;

do $$ begin
  insert into public.day_entries (user_id, date, tasks)
  values ('00000000-0000-0000-0000-00000000000b', current_date, pg_temp.open_tasks());
  raise exception 'FAILED: wrote another user''s row';
exception when insufficient_privilege then raise notice 'ok - cannot write for someone else';
end $$;

do $$ begin
  perform public.complete_day(current_date);
  raise exception 'FAILED: completed an unfinished day';
exception when sqlstate '22023' then raise notice 'ok - complete_day needs 3 done tasks';
end $$;

select public.import_local_entries(pg_temp.history(5, 1));
select pg_temp.expect((select current from public.streak_state) = 5, 'import recomputes streak (5)');

update public.day_entries set tasks = pg_temp.won_tasks() where date = current_date;
select pg_temp.expect((public.complete_day(current_date)).current = 6, 'completing today extends to 6');

do $$ begin
  perform public.complete_day(current_date - 1);
  raise exception 'FAILED: completed a past day';
exception when sqlstate '22023' then raise notice 'ok - only today can be completed';
end $$;

do $$ begin
  update public.streak_state set current = 999;
  raise exception 'FAILED: client wrote streak';
exception when insufficient_privilege then raise notice 'ok - client cannot write streak numbers';
end $$;

do $$ begin
  update public.day_entries set tasks = pg_temp.open_tasks() where date = current_date - 2;
  raise exception 'FAILED: edited a past day';
exception when sqlstate '22023' then raise notice 'ok - past days are read-only';
end $$;

select pg_temp.expect((public.import_local_entries(pg_temp.history(3, 1))).current = 6,
  'importing again does not duplicate or double count');

select pg_temp.expect((public.grant_monthly_savior()).saviors = 1, 'first grant gives one savior');
select pg_temp.expect((public.grant_monthly_savior()).saviors = 1, 'grant is idempotent within a month');

do $$ begin
  update public.user_settings set time_zone = 'Mars/Olympus' where user_id = auth.uid();
  insert into public.user_settings (user_id, time_zone) values (auth.uid(), 'Mars/Olympus');
  raise exception 'FAILED: accepted bogus zone';
exception when check_violation then raise notice 'ok - time zone must be real';
end $$;

insert into public.user_settings (user_id, custom_affirmations)
values (:a, jsonb_build_array(jsonb_build_object('id', 'x', 'text', 'I keep my word.')));
do $$ begin
  update public.user_settings set custom_affirmations = jsonb_build_array(jsonb_build_object('id', 'x', 'text', repeat('y', 141)));
  raise exception 'FAILED: long affirmation';
exception when check_violation then raise notice 'ok - affirmations capped at 140';
end $$;
commit;

-- ---------------------------------------------------------------- user B: isolation
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :b, true);
select pg_temp.expect((select count(*) from public.day_entries) = 0, 'B cannot see A''s entries');
select pg_temp.expect((select count(*) from public.streak_state) = 0, 'B cannot see A''s streak');
select pg_temp.expect((select count(*) from public.user_settings) = 0, 'B cannot see A''s settings');
delete from public.day_entries;
commit;
select pg_temp.expect((select count(*) from public.day_entries where user_id = :a) = 6, 'B could not delete A''s rows');

-- ---------------------------------------------------------------- user C: one missed day, one savior
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :c, true);
select public.import_local_entries(pg_temp.history(12, 2));
select pg_temp.expect((public.decline_saviors()).current = 0, 'a gap leaves no standing streak');
select pg_temp.expect((public.grant_monthly_savior()).saviors = 1, 'C has one savior');

do $$ begin
  perform public.use_saviors(array[current_date - 2]);
  raise exception 'FAILED: saved a won day';
exception when sqlstate '22023' then raise notice 'ok - cannot save a won day';
end $$;

do $$ begin
  perform public.use_saviors(array[current_date]);
  raise exception 'FAILED: saved today';
exception when sqlstate '22023' then raise notice 'ok - cannot save today';
end $$;

select pg_temp.expect((public.use_saviors(array[current_date - 1])).current = 12, 'savior keeps 12-day streak');
select pg_temp.expect((select saviors from public.streak_state) = 0, 'savior was spent');
select pg_temp.expect((select saved_dates from public.streak_state) = array[current_date - 1], 'saved date recorded');

insert into public.day_entries (user_id, date, tasks) values (:c, current_date, pg_temp.won_tasks());
select pg_temp.expect((public.complete_day(current_date)).current = 13, 'saved day bridges but does not add (13)');
commit;

-- ---------------------------------------------------------------- user D: two missed days, one savior
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :d, true);
select public.import_local_entries(pg_temp.history(12, 3));
select public.grant_monthly_savior();

do $$ begin
  perform public.use_saviors(array[current_date - 2, current_date - 1]);
  raise exception 'FAILED: used more saviors than banked';
exception when sqlstate '22023' then raise notice 'ok - cannot overspend saviors';
end $$;

select pg_temp.expect((public.decline_saviors()).current = 0, 'declining resets the streak');
select pg_temp.expect((select best from public.streak_state) = 12, 'best streak is kept');

select public.delete_my_data();
select pg_temp.expect((select count(*) from public.day_entries) = 0, 'delete_my_data clears entries');
commit;

-- ---------------------------------------------------------------- anon
begin;
set local role anon;
do $$ begin
  perform public.grant_monthly_savior();
  raise exception 'FAILED: anon called API';
exception when insufficient_privilege then raise notice 'ok - anon cannot call the API';
end $$;
do $$ begin
  perform 1 from public.day_entries;
  raise exception 'FAILED: anon read entries';
exception when insufficient_privilege then raise notice 'ok - anon cannot read tables';
end $$;
commit;

\echo 'All database tests passed.'
