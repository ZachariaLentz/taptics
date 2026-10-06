-- Canonical v1 model. Back up a legacy project before applying (see supabase/README.md).
begin;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  level integer not null default 1,
  xp integer not null default 0,
  streak integer not null default 0,
  last_played date
);
alter table public.profiles add column if not exists level integer not null default 1;
alter table public.profiles add column if not exists xp integer not null default 0;
alter table public.profiles add column if not exists streak integer not null default 0;
alter table public.profiles add column if not exists last_played date;
create table public.training_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  played_on date not null,
  created_at timestamptz not null default now(),
  level integer not null check (level between 1 and 100),
  correct integer not null check (correct between 0 and 10),
  xp integer generated always as (correct * 10 + case when correct >= 7 then 20 else 0 end) stored
);
create index training_sessions_user_date on public.training_sessions(user_id, played_on desc);
create table public.daily_completions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  played_on date not null,
  created_at timestamptz not null default now(),
  correct boolean not null,
  selected numeric not null,
  puzzle jsonb not null check (jsonb_typeof(puzzle) = 'object'),
  xp integer generated always as (case when correct then 25 else 5 end) stored,
  unique (user_id, played_on)
);
-- Unique user/date constraint also provides the Daily lookup index.
alter table public.profiles enable row level security;
alter table public.training_sessions enable row level security;
alter table public.daily_completions enable row level security;
-- Remove legacy policies: hiding admin UI is not authorization.
do $$ declare item record; begin
  for item in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('profiles','training_sessions','daily_completions','level_config') loop
    execute format('drop policy %I on %I.%I', item.policyname, item.schemaname, item.tablename);
  end loop;
  if to_regclass('public.level_config') is not null then
    execute 'alter table public.level_config enable row level security';
    execute 'revoke all on public.level_config from anon, authenticated';
  end if;
end $$;
revoke all on public.profiles, public.training_sessions, public.daily_completions from anon, authenticated;
grant select on public.profiles, public.training_sessions, public.daily_completions to authenticated;
create policy profiles_read_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy training_read_own on public.training_sessions for select to authenticated using (user_id = (select auth.uid()));
create policy daily_read_own on public.daily_completions for select to authenticated using (user_id = (select auth.uid()));
-- All awards are atomic, serialized per user, and computed by this function, never profile UPDATEs.
create or replace function public.record_completion(
  p_id uuid, p_kind text, p_date date, p_level integer, p_correct integer,
  p_created_at timestamptz, p_selected numeric default null, p_puzzle jsonb default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  current_level integer;
  total_xp integer;
  last_day date;
  streak_count integer;
begin
  if actor is null or not exists(select 1 from auth.users where id = actor) then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  -- Retries (including old offline results) return before validation and never reward again.
  if p_kind = 'training' and exists(select 1 from public.training_sessions where id = p_id and user_id = actor) then return; end if;
  if p_kind = 'daily' and exists(select 1 from public.daily_completions where user_id = actor and played_on = p_date) then return; end if;
  if p_date is null or p_created_at is null or p_date > (now() at time zone 'UTC')::date + 1 or p_date < (now() at time zone 'UTC')::date - 366 or p_created_at > now() + interval '1 day' then
    raise exception 'Invalid completion date';
  end if;
  select least(100, coalesce(max(level + 1) filter (where correct >= 7), 1)) into current_level from public.training_sessions where user_id = actor;
  if p_kind = 'training' then
    if p_level is null or p_level < 1 or p_level > current_level or p_correct is null or p_correct < 0 or p_correct > 10 then raise exception 'Invalid training result'; end if;
    insert into public.training_sessions(id,user_id,played_on,created_at,level,correct) values(p_id,actor,p_date,p_created_at,p_level,p_correct);
  elsif p_kind = 'daily' then
    if p_correct is null or p_correct not in (0,1) or p_selected is null or p_puzzle is null or jsonb_typeof(p_puzzle->'choices') is distinct from 'array' or jsonb_array_length(p_puzzle->'choices') <> 4 or not (p_puzzle->'choices' @> jsonb_build_array(p_selected)) or jsonb_typeof(p_puzzle->'answer') is distinct from 'number' then raise exception 'Invalid Daily result'; end if;
    if (p_selected = (p_puzzle->>'answer')::numeric) <> (p_correct = 1) then raise exception 'Daily answer mismatch'; end if;
    insert into public.daily_completions(id,user_id,played_on,created_at,correct,selected,puzzle) values(p_id,actor,p_date,p_created_at,p_correct = 1,p_selected,p_puzzle);
  else raise exception 'Unknown completion type'; end if;
  select coalesce(sum(xp),0) into total_xp from (
    select xp from public.training_sessions where user_id = actor union all select xp from public.daily_completions where user_id = actor
  ) rewards;
  select least(100,coalesce(max(level + 1) filter(where correct >= 7),1)) into current_level from public.training_sessions where user_id = actor;
  with days as (select played_on from public.training_sessions where user_id = actor union select played_on from public.daily_completions where user_id = actor),
    numbered as (select played_on, row_number() over(order by played_on desc)::integer as n from days)
  select max(played_on), count(*) filter(where played_on = (select max(played_on) from days) - (n - 1)) into last_day,streak_count from numbered;
  insert into public.profiles(id,level,xp,streak,last_played) values(actor,current_level,total_xp,streak_count,last_day)
  on conflict(id) do update set level=excluded.level,xp=excluded.xp,streak=excluded.streak,last_played=excluded.last_played;
end $$;
revoke all on function public.record_completion(uuid,text,date,integer,integer,timestamptz,numeric,jsonb) from public, anon;
grant execute on function public.record_completion(uuid,text,date,integer,integer,timestamptz,numeric,jsonb) to authenticated;
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
commit;
