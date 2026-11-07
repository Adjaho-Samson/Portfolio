-- TchatzDev: statistiques d'audience anonymisées.
-- Appliquer dans Supabase SQL Editor ou avec `supabase db push`.
-- Aucune adresse IP, donnée de profil ou adresse électronique n'est stockée ici.

create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  singleton boolean not null default true check (singleton),
  created_at timestamptz not null default now(),
  constraint portfolio_admins_one_account unique (singleton)
);

create table if not exists public.portfolio_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('page_view', 'project_view', 'project_click', 'music_download')),
  occurred_at timestamptz not null default now(),
  session_id text not null check (length(session_id) between 16 and 80),
  path text not null check (length(path) between 1 and 300),
  project_slug text check (project_slug is null or length(project_slug) <= 60),
  referrer_source text not null default 'direct' check (referrer_source in ('direct', 'search', 'social', 'referral', 'other')),
  referrer_domain text check (referrer_domain is null or length(referrer_domain) <= 120),
  device_category text not null default 'other' check (device_category in ('desktop', 'mobile', 'tablet', 'other')),
  browser text not null default 'Other' check (browser in ('Chrome', 'Safari', 'Firefox', 'Edge', 'Opera', 'Other')),
  constraint portfolio_event_project_required check (
    (event_type = 'page_view' and project_slug is null)
    or (event_type in ('project_view', 'project_click') and project_slug is not null)
    or (event_type = 'music_download' and project_slug is null)
  )
);

create index if not exists portfolio_events_time_type_idx
  on public.portfolio_events (occurred_at desc, event_type);
create index if not exists portfolio_events_session_time_idx
  on public.portfolio_events (session_id, occurred_at desc);
create index if not exists portfolio_events_page_time_idx
  on public.portfolio_events (path, occurred_at desc) where event_type = 'page_view';
create index if not exists portfolio_events_project_time_idx
  on public.portfolio_events (project_slug, occurred_at desc) where event_type in ('project_view', 'project_click');

alter table public.portfolio_admins enable row level security;
alter table public.portfolio_events enable row level security;

-- Aucun accès direct aux tables depuis anon/authenticated. La fonction Edge,
-- seule détentrice de service_role, écrit des événements validés ; le RPC
-- SECURITY DEFINER ci-dessous ne révèle les agrégats qu'à l'administrateur.
revoke all on table public.portfolio_admins from public, anon, authenticated;
revoke all on table public.portfolio_events from public, anon, authenticated;
revoke all on sequence public.portfolio_events_id_seq from public, anon, authenticated;
grant select, insert on table public.portfolio_events to service_role;
grant usage, select on sequence public.portfolio_events_id_seq to service_role;

create or replace function public.enforce_portfolio_event_rate_limit()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.portfolio_events
  where session_id = new.session_id
    and occurred_at > now() - interval '1 hour';
  if recent_count >= 240 then
    raise exception 'event rate limit reached';
  end if;
  return new;
end;
$$;

drop trigger if exists portfolio_events_rate_limit on public.portfolio_events;
create trigger portfolio_events_rate_limit
before insert on public.portfolio_events
for each row execute function public.enforce_portfolio_event_rate_limit();

create or replace function public.portfolio_dashboard(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  result jsonb;
  range_start timestamptz;
begin
  if auth.uid() is null or not exists (
    select 1 from public.portfolio_admins a where a.user_id = auth.uid()
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_days is null or p_days not in (7, 30, 90) then
    raise exception 'unsupported reporting period' using errcode = '22023';
  end if;
  range_start := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
    - make_interval(days => p_days - 1);

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'total_views', (select count(*) from public.portfolio_events e where e.event_type = 'page_view'),
      'unique_visitors', (select count(distinct e.session_id) from public.portfolio_events e where e.event_type = 'page_view'),
      'today_views', (select count(*) from public.portfolio_events e where e.event_type = 'page_view' and e.occurred_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'),
      'week_views', (select count(*) from public.portfolio_events e where e.event_type = 'page_view' and e.occurred_at >= now() - interval '7 days'),
      'month_views', (select count(*) from public.portfolio_events e where e.event_type = 'page_view' and e.occurred_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'),
      'period_unique', (select count(distinct e.session_id) from public.portfolio_events e where e.event_type = 'page_view' and e.occurred_at >= range_start),
      'project_views', (select count(*) from public.portfolio_events e where e.event_type = 'project_view' and e.occurred_at >= range_start),
      'project_clicks', (select count(*) from public.portfolio_events e where e.event_type = 'project_click' and e.occurred_at >= range_start),
      'music_downloads', (select count(*) from public.portfolio_events e where e.event_type = 'music_download')
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', to_char(days.day, 'YYYY-MM-DD'),
        'label', to_char(days.day, 'DD Mon'),
        'views', coalesce(metrics.views, 0),
        'visitors', coalesce(metrics.visitors, 0)
      ) order by days.day)
      from generate_series(range_start, date_trunc('day', now() at time zone 'UTC') at time zone 'UTC', interval '1 day') as days(day)
      left join lateral (
        select count(*) filter (where e.event_type = 'page_view') as views,
               count(distinct e.session_id) filter (where e.event_type = 'page_view') as visitors
        from public.portfolio_events e
        where e.occurred_at >= days.day and e.occurred_at < days.day + interval '1 day'
      ) metrics on true
    ), '[]'::jsonb),
    'top_pages', coalesce((
      select jsonb_agg(jsonb_build_object('path', ranked.path, 'views', ranked.views) order by ranked.views desc, ranked.path)
      from (select e.path, count(*) as views from public.portfolio_events e where e.event_type = 'page_view' and e.occurred_at >= range_start group by e.path order by count(*) desc, e.path limit 8) ranked
    ), '[]'::jsonb),
    'top_project_views', coalesce((
      select jsonb_agg(jsonb_build_object('project', ranked.project_slug, 'views', ranked.views) order by ranked.views desc, ranked.project_slug)
      from (select e.project_slug, count(*) as views from public.portfolio_events e where e.event_type = 'project_view' and e.occurred_at >= range_start group by e.project_slug order by count(*) desc, e.project_slug limit 8) ranked
    ), '[]'::jsonb),
    'top_project_clicks', coalesce((
      select jsonb_agg(jsonb_build_object('project', ranked.project_slug, 'clicks', ranked.clicks) order by ranked.clicks desc, ranked.project_slug)
      from (select e.project_slug, count(*) as clicks from public.portfolio_events e where e.event_type = 'project_click' and e.occurred_at >= range_start group by e.project_slug order by count(*) desc, e.project_slug limit 8) ranked
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('source', ranked.source, 'count', ranked.count) order by ranked.count desc, ranked.source)
      from (select e.referrer_source as source, count(*) as count from public.portfolio_events e where e.event_type = 'page_view' and e.occurred_at >= range_start group by e.referrer_source order by count(*) desc, e.referrer_source) ranked
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('device', ranked.device, 'count', ranked.count) order by ranked.count desc, ranked.device)
      from (select e.device_category as device, count(*) as count from public.portfolio_events e where e.event_type = 'page_view' and e.occurred_at >= range_start group by e.device_category order by count(*) desc, e.device_category) ranked
    ), '[]'::jsonb),
    'browsers', coalesce((
      select jsonb_agg(jsonb_build_object('browser', ranked.browser, 'count', ranked.count) order by ranked.count desc, ranked.browser)
      from (select e.browser, count(*) as count from public.portfolio_events e where e.event_type = 'page_view' and e.occurred_at >= range_start group by e.browser order by count(*) desc, e.browser) ranked
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.portfolio_dashboard(integer) from public, anon;
grant execute on function public.portfolio_dashboard(integer) to authenticated;

comment on table public.portfolio_events is 'Événements pseudonymes minimaux du portfolio. Aucun IP, cookie ou profil utilisateur.';
comment on table public.portfolio_admins is 'Liste d’autorisation des comptes administrateurs Supabase Auth.';
comment on function public.portfolio_dashboard(integer) is 'Statistiques agrégées. Vérifie auth.uid() dans la liste portfolio_admins.';
