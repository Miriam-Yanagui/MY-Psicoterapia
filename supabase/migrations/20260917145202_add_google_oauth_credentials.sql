create table public.google_oauth_credentials (
  id text primary key check (id = 'primary'),
  refresh_token text not null,
  authorized_email text not null,
  scope text not null default '',
  token_type text not null default 'Bearer',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_oauth_credentials enable row level security;

revoke all on table public.google_oauth_credentials from public, anon, authenticated;
grant select, insert, update, delete on table public.google_oauth_credentials to service_role;

comment on table public.google_oauth_credentials is
  'Server-only Google Calendar OAuth credential for the professional account. Never exposed to browser roles.';
