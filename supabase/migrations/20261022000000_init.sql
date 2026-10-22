-- Triority schema: day entries, server-owned streak state, and user settings.
-- Every table is row-level secured to its owner. Streak numbers are only ever
-- written by the security-definer functions below, never by the client.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Validation helpers
-- ---------------------------------------------------------------------------

create or replace function private.valid_tasks(tasks jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(tasks) = 'array'
    and jsonb_array_length(tasks) = 3
    and not exists (
      select 1
      from jsonb_array_elements(tasks) as t(task)
      where jsonb_typeof(t.task) <> 'object'
        or jsonb_typeof(t.task -> 'text') is distinct from 'string'
        or char_length(btrim(t.task ->> 'text')) not between 1 and 80
        or jsonb_typeof(t.task -> 'done') is distinct from 'boolean'
        or (t.task ? 'doneAt' and jsonb_typeof(t.task -> 'doneAt') not in ('string', 'null'))
        or exists (select 1 from jsonb_object_keys(t.task) as k(key) where k.key not in ('text', 'done', 'doneAt'))
    );
$$;

create or replace function private.is_won(tasks jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select private.valid_tasks(tasks)
    and not exists (
      select 1 from jsonb_array_elements(tasks) as t(task) where (t.task ->> 'done')::boolean is not true
    );
$$;

create or replace function private.valid_affirmations(items jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(items) = 'array'
    and jsonb_array_length(items) <= 50
    and not exists (
      select 1
      from jsonb_array_elements(items) as a(item)
      where jsonb_typeof(a.item) <> 'object'
        or jsonb_typeof(a.item -> 'id') is distinct from 'string'
        or char_length(a.item ->> 'id') not between 1 and 64
        or jsonb_typeof(a.item -> 'text') is distinct from 'string'
        or char_length(btrim(a.item ->> 'text')) not between 1 and 140
    );
$$;

create or replace function private.valid_time_zone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.day_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  tasks jsonb not null check (private.valid_tasks(tasks)),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.streak_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current integer not null default 0 check (current >= 0),
  best integer not null default 0 check (best >= 0),
  saviors integer not null default 0 check (saviors between 0 and 2),
  last_savior_grant_month text check (last_savior_grant_month ~ '^\d{4}-\d{2}$'),
  saved_dates date[] not null default '{}'
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reminder_time time,
  custom_affirmations jsonb not null default '[]' check (private.valid_affirmations(custom_affirmations)),
  -- IANA zone used to decide which date is "today" for this user.
  time_zone text not null default 'UTC' check (private.valid_time_zone(time_zone))
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.day_entries enable row level security;
alter table public.streak_state enable row level security;
alter table public.user_settings enable row level security;

create policy "own entries: select" on public.day_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own entries: insert" on public.day_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own entries: update" on public.day_entries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own entries: delete" on public.day_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Streak rows are read-only to their owner; only the functions below write them.
create policy "own streak: select" on public.streak_state
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "own settings: select" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own settings: insert" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own settings: update" on public.user_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own settings: delete" on public.user_settings
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.day_entries, public.streak_state, public.user_settings from anon;
revoke insert, update, delete on public.streak_state from authenticated;
grant select on public.streak_state to authenticated;
grant select, insert, update, delete on public.day_entries, public.user_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Day boundaries
-- ---------------------------------------------------------------------------

create or replace function private.user_today(p_user uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (pg_catalog.now() at time zone coalesce(
    (select s.time_zone from public.user_settings s where s.user_id = p_user),
    'UTC'
  ))::date;
$$;

-- Clients may only write today's entry (or tomorrow's, for a device that has
-- just crossed into a timezone further ahead). Past days are read-only.
-- Runs as the caller, so current_user tells client writes apart from server functions.
create or replace function private.guard_day_entry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_today date;
begin
  new.updated_at := pg_catalog.now();
  -- Server-side functions (running as the table owner) may import history.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'UPDATE' and (new.date <> old.date or new.user_id <> old.user_id) then
    raise exception 'Entries cannot be moved.' using errcode = '22023';
  end if;
  v_today := private.user_today(new.user_id);
  if new.date < v_today or new.date > v_today + 1 then
    raise exception 'Only today''s tasks can be changed.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger day_entries_guard
  before insert or update on public.day_entries
  for each row execute function private.guard_day_entry();

-- ---------------------------------------------------------------------------
-- Streak computation (mirrors src/domain/streak.ts)
-- ---------------------------------------------------------------------------

create or replace function private.run_ending_on(p_end date, p_won date[], p_saved date[])
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  d date := p_end;
  n integer := 0;
begin
  loop
    if d = any (p_won) then
      n := n + 1;
    elsif not (d = any (p_saved)) then
      exit;
    end if;
    d := d - 1;
  end loop;
  return n;
end;
$$;

create or replace function private.recompute_streak(p_user uuid)
returns public.streak_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := private.user_today(p_user);
  v_won date[];
  v_saved date[];
  v_current integer;
  v_best integer := 0;
  v_run integer := 0;
  v_prev date;
  d date;
  v_row public.streak_state;
begin
  insert into public.streak_state (user_id) values (p_user) on conflict (user_id) do nothing;
  select coalesce(s.saved_dates, '{}') into v_saved from public.streak_state s where s.user_id = p_user;

  -- Tolerate a device one day ahead of the stored zone.
  if exists (select 1 from public.day_entries e where e.user_id = p_user and e.date = v_today + 1) then
    v_today := v_today + 1;
  end if;

  select coalesce(array_agg(e.date order by e.date), '{}')
    into v_won
    from public.day_entries e
   where e.user_id = p_user and e.date <= v_today and private.is_won(e.tasks);

  if v_today = any (v_won) then
    v_current := private.run_ending_on(v_today, v_won, v_saved);
  else
    v_current := private.run_ending_on(v_today - 1, v_won, v_saved);
  end if;

  for d in
    select distinct x from unnest(v_won || v_saved) as x where x <= v_today order by x
  loop
    if d = any (v_won) then
      v_run := case when v_prev is not null and v_prev + 1 = d then v_run + 1 else 1 end;
    elsif v_prev is null or v_prev + 1 <> d then
      v_run := 0;
    end if;
    v_best := greatest(v_best, v_run);
    v_prev := d;
  end loop;

  update public.streak_state s
     set current = v_current,
         best = greatest(s.best, v_best, v_current)
   where s.user_id = p_user
  returning * into v_row;
  return v_row;
end;
$$;

-- Unwon, unsaved days between the last won/saved day and yesterday (max 3 looked at).
create or replace function private.current_gap(p_user uuid, p_today date)
returns date[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_saved date[];
  v_gap date[] := '{}';
  d date := p_today - 1;
begin
  select coalesce(s.saved_dates, '{}') into v_saved from public.streak_state s where s.user_id = p_user;
  while cardinality(v_gap) <= 2 loop
    if d = any (coalesce(v_saved, '{}'))
       or exists (select 1 from public.day_entries e where e.user_id = p_user and e.date = d and private.is_won(e.tasks)) then
      return v_gap;
    end if;
    v_gap := d || v_gap;
    d := d - 1;
  end loop;
  return null; -- longer than any savior bank
end;
$$;

-- ---------------------------------------------------------------------------
-- Public API (callable by signed-in users)
-- ---------------------------------------------------------------------------

create or replace function public.complete_day(p_date date)
returns public.streak_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date;
begin
  if v_user is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  v_today := private.user_today(v_user);
  if p_date < v_today or p_date > v_today + 1 then
    raise exception 'Only today can be completed.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.day_entries e where e.user_id = v_user and e.date = p_date and private.is_won(e.tasks)
  ) then
    raise exception 'That day does not have three finished tasks.' using errcode = '22023';
  end if;
  return private.recompute_streak(v_user);
end;
$$;

create or replace function public.grant_monthly_savior()
returns public.streak_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_month text;
  v_row public.streak_state;
  v_grants integer;
begin
  if v_user is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  v_month := to_char(private.user_today(v_user), 'YYYY-MM');
  insert into public.streak_state (user_id) values (v_user) on conflict (user_id) do nothing;
  select * into v_row from public.streak_state s where s.user_id = v_user for update;

  if v_row.last_savior_grant_month is distinct from v_month then
    if v_row.last_savior_grant_month is null then
      v_grants := 1;
    else
      v_grants := (split_part(v_month, '-', 1)::int - split_part(v_row.last_savior_grant_month, '-', 1)::int) * 12
                + (split_part(v_month, '-', 2)::int - split_part(v_row.last_savior_grant_month, '-', 2)::int);
    end if;
    if v_grants > 0 then
      update public.streak_state s
         set saviors = least(2, s.saviors + v_grants),
             last_savior_grant_month = v_month
       where s.user_id = v_user
      returning * into v_row;
    end if;
  end if;
  return v_row;
end;
$$;

create or replace function public.use_saviors(dates date[])
returns public.streak_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date;
  v_gap date[];
  v_dates date[];
  v_row public.streak_state;
begin
  if v_user is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct x order by x), '{}') into v_dates from unnest(dates) as x;
  if cardinality(v_dates) = 0 then
    raise exception 'No days to save.' using errcode = '22023';
  end if;

  v_today := private.user_today(v_user);
  if exists (select 1 from public.day_entries e where e.user_id = v_user and e.date = v_today + 1) then
    v_today := v_today + 1;
  end if;

  select * into v_row from public.streak_state s where s.user_id = v_user for update;
  if v_row is null or v_row.saviors < cardinality(v_dates) then
    raise exception 'Not enough saviors.' using errcode = '22023';
  end if;

  v_gap := private.current_gap(v_user, v_today);
  if v_gap is null or cardinality(v_gap) = 0 or not (v_dates <@ v_gap) then
    raise exception 'Only missed days right before today can be saved.' using errcode = '22023';
  end if;
  -- There must be a real streak on the far side of the gap.
  if private.run_ending_on(v_gap[1] - 1,
       (select coalesce(array_agg(e.date), '{}') from public.day_entries e
         where e.user_id = v_user and private.is_won(e.tasks)),
       v_row.saved_dates) = 0 then
    raise exception 'There is no streak to save.' using errcode = '22023';
  end if;

  update public.streak_state s
     set saviors = s.saviors - cardinality(v_dates),
         saved_dates = (select array_agg(distinct x order by x) from unnest(s.saved_dates || v_dates) as x)
   where s.user_id = v_user;
  return private.recompute_streak(v_user);
end;
$$;

create or replace function public.decline_saviors()
returns public.streak_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  return private.recompute_streak(v_user);
end;
$$;

create or replace function public.import_local_entries(entries jsonb, saved_dates date[] default '{}')
returns public.streak_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date;
  v_saved date[];
begin
  if v_user is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  if jsonb_typeof(entries) <> 'array' or jsonb_array_length(entries) > 5000 then
    raise exception 'Invalid import.' using errcode = '22023';
  end if;
  v_today := private.user_today(v_user);

  if exists (
    select 1 from jsonb_array_elements(entries) as x(entry)
     where jsonb_typeof(x.entry) <> 'object'
        or (x.entry ->> 'date') !~ '^\d{4}-\d{2}-\d{2}$'
        or not private.valid_tasks(x.entry -> 'tasks')
  ) then
    raise exception 'Invalid entry in import.' using errcode = '22023';
  end if;

  insert into public.day_entries (user_id, date, tasks)
  select v_user, (x.entry ->> 'date')::date, x.entry -> 'tasks'
    from jsonb_array_elements(entries) as x(entry)
   where (x.entry ->> 'date')::date <= v_today + 1
  on conflict (user_id, date) do nothing;

  -- Carry over saved days, but only real gaps (never a won day), at most two per month.
  select coalesce(array_agg(d order by d), '{}') into v_saved
    from (
      select d, row_number() over (partition by date_trunc('month', d) order by d) as n
        from (select distinct unnest(coalesce(saved_dates, '{}')) as d) s
       where d < v_today
         and not exists (
           select 1 from public.day_entries e
            where e.user_id = v_user and e.date = s.d and private.is_won(e.tasks)
         )
    ) ranked
   where n <= 2;

  insert into public.streak_state (user_id) values (v_user) on conflict (user_id) do nothing;
  update public.streak_state s
     set saved_dates = (select coalesce(array_agg(distinct x order by x), '{}') from unnest(s.saved_dates || v_saved) as x)
   where s.user_id = v_user;

  return private.recompute_streak(v_user);
end;
$$;

create or replace function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  delete from public.day_entries where user_id = v_user;
  delete from public.user_settings where user_id = v_user;
  delete from public.streak_state where user_id = v_user;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  delete from auth.users where id = v_user;
end;
$$;

-- Lock down execution: only signed-in users may call the API. The private schema is not
-- exposed over the API; signed-in users may only run the checks their own writes trigger.
revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function
  private.valid_tasks(jsonb),
  private.valid_affirmations(jsonb),
  private.valid_time_zone(text),
  private.user_today(uuid),
  private.guard_day_entry()
to authenticated;
revoke execute on function
  public.complete_day(date),
  public.grant_monthly_savior(),
  public.use_saviors(date[]),
  public.decline_saviors(),
  public.import_local_entries(jsonb, date[]),
  public.delete_my_data(),
  public.delete_my_account()
from public, anon;
grant execute on function
  public.complete_day(date),
  public.grant_monthly_savior(),
  public.use_saviors(date[]),
  public.decline_saviors(),
  public.import_local_entries(jsonb, date[]),
  public.delete_my_data(),
  public.delete_my_account()
to authenticated;
