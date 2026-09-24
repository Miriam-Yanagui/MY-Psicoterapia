-- Anonymous product analytics. Never stores intake answers, contact data, IPs,
-- user-agent strings, appointment identifiers, or the browser's raw session id.
create table public.booking_funnel_events (
  id bigint generated always as identity primary key,
  session_hash text not null check (session_hash ~ '^[0-9a-f]{64}$'),
  event_name text not null check (event_name in (
    'onboarding_started', 'name_reached', 'emotion_reached', 'experience_reached',
    'goals_reached', 'schedule_reached', 'hold_created', 'checkout_reached',
    'contact_saved', 'payment_started', 'confirmation_reached'
  )),
  path text not null check (path ~ '^/onboarding/[a-z-]{1,32}$'),
  created_at timestamptz not null default now(),
  unique (session_hash, event_name)
);

create index booking_funnel_events_created_at_idx
  on public.booking_funnel_events (created_at desc);

alter table public.booking_funnel_events enable row level security;
revoke all on public.booking_funnel_events from public, anon, authenticated;
grant select, insert, delete on public.booking_funnel_events to service_role;

comment on table public.booking_funnel_events is
  'Consent-gated anonymous funnel events. Contains no intake, contact, appointment, IP, or user-agent data.';
