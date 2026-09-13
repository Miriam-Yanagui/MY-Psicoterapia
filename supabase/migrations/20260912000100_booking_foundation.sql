-- Batch 4B-1: persistence foundation for availability and future bookings.
-- No hold workflow, payment integration, webhook, or authentication is created here.

create extension if not exists pgcrypto with schema extensions;

create type public.slot_availability_status as enum (
  'open',
  'blocked',
  'cancelled'
);

create type public.appointment_status as enum (
  'held',
  'payment_pending',
  'confirmed',
  'expired',
  'cancelled'
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_valid_iana_timezone(value text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = value
      and position('/' in name) > 0
  );
$$;

create or replace function private.validate_slot_timezone()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_valid_iana_timezone(new.timezone) then
    raise exception 'timezone must be a valid IANA timezone';
  end if;
  return new;
end;
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.is_valid_iana_timezone(text) from public, anon, authenticated;
revoke all on function private.validate_slot_timezone() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  availability_status public.slot_availability_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slots_ends_after_start check (ends_at > starts_at),
  constraint slots_duration_50_minutes check (ends_at = starts_at + interval '50 minutes'),
  constraint slots_unique_interval unique (starts_at, ends_at)
);

create index slots_availability_starts_at_idx
  on public.slots (availability_status, starts_at);

create trigger slots_validate_timezone
before insert or update of timezone on public.slots
for each row execute function private.validate_slot_timezone();

create trigger slots_set_updated_at
before update on public.slots
for each row execute function private.set_updated_at();

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null,
  status public.appointment_status not null,
  hold_expires_at timestamptz,
  email text,
  country_code text,
  phone text,
  consent_version text,
  consented_at timestamptz,
  amount_minor integer not null,
  currency char(3) not null,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_slot_id_fkey
    foreign key (slot_id) references public.slots(id) on delete restrict,
  constraint appointments_amount_positive check (amount_minor > 0),
  constraint appointments_currency_allowed check (currency = 'MXN'),
  constraint appointments_hold_expiration_consistent check (
    (status in ('held', 'payment_pending') and hold_expires_at is not null)
    or
    (status in ('confirmed', 'expired', 'cancelled') and hold_expires_at is null)
  ),
  constraint appointments_contact_all_or_none check (
    (email is null and country_code is null and phone is null and consent_version is null and consented_at is null)
    or
    (email is not null and country_code is not null and phone is not null and consent_version is not null and consented_at is not null)
  ),
  constraint appointments_email_normalized check (email is null or email = lower(btrim(email))),
  constraint appointments_country_code_format check (country_code is null or country_code ~ '^\\+[1-9][0-9]{0,3}$'),
  constraint appointments_phone_e164_format check (phone is null or phone ~ '^\\+[1-9][0-9]{7,14}$'),
  constraint appointments_confirmed_at_consistent check (
    (status = 'confirmed' and confirmed_at is not null)
    or
    (status <> 'confirmed' and confirmed_at is null)
  ),
  constraint appointments_cancelled_at_consistent check (
    (status = 'cancelled' and cancelled_at is not null)
    or
    (status <> 'cancelled' and cancelled_at is null)
  )
);

create index appointments_slot_status_idx
  on public.appointments (slot_id, status);

create index appointments_status_hold_expires_at_idx
  on public.appointments (status, hold_expires_at);

create unique index appointments_one_active_per_slot_idx
  on public.appointments (slot_id)
  where status in ('held', 'payment_pending', 'confirmed');

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function private.set_updated_at();

alter table public.slots enable row level security;
alter table public.slots force row level security;
alter table public.appointments enable row level security;
alter table public.appointments force row level security;

revoke all on table public.slots from anon, authenticated;
revoke all on table public.appointments from anon, authenticated;
grant select, insert, update, delete on table public.slots to service_role;
grant select, insert, update, delete on table public.appointments to service_role;

comment on table public.slots is 'Operational appointment availability; server-side access only.';
comment on table public.appointments is 'Booking foundation for later batches; server-side access only.';
