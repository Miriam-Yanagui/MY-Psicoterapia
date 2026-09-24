-- Durable Google Calendar creation plus the new private practitioner inbox.
create table public.calendar_outbox (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'created', 'failed')),
  attempts smallint not null default 0 check (attempts between 0 and 12),
  next_attempt_at timestamptz not null default now(),
  google_event_id text,
  meet_url text,
  last_error text,
  created_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendar_outbox_pending_idx
  on public.calendar_outbox (status, next_attempt_at, created_at)
  where status in ('pending', 'processing');

create trigger calendar_outbox_set_updated_at
before update on public.calendar_outbox
for each row execute function private.set_updated_at();

alter table public.calendar_outbox enable row level security;
alter table public.calendar_outbox force row level security;
revoke all on public.calendar_outbox from public, anon, authenticated;
grant select, insert, update, delete on public.calendar_outbox to service_role;

create function private.enqueue_confirmed_appointment_calendar()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'confirmed'::public.appointment_status
     and old.status is distinct from new.status then
    insert into public.calendar_outbox (appointment_id)
    values (new.id)
    on conflict (appointment_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger appointments_enqueue_calendar_event
after update of status on public.appointments
for each row execute function private.enqueue_confirmed_appointment_calendar();

revoke all on function private.enqueue_confirmed_appointment_calendar() from public, anon, authenticated;

-- Repair only upcoming confirmed appointments. This cannot create invitations
-- for historical sessions that have already taken place.
insert into public.calendar_outbox (appointment_id)
select a.id
from public.appointments a
join public.slots s on s.id = a.slot_id
where a.status = 'confirmed'::public.appointment_status
  and s.starts_at > now()
on conflict (appointment_id) do nothing;

create or replace function private.enqueue_confirmed_appointment_emails()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'confirmed'::public.appointment_status
     and old.status is distinct from new.status then
    insert into public.email_outbox (appointment_id, kind, recipient)
    values
      (new.id, 'patient_confirmation', new.email),
      (new.id, 'practitioner_notice', 'myterapiacc@gmail.com')
    on conflict (appointment_id, kind) do nothing;
  end if;
  return new;
end;
$$;

update public.email_outbox
set recipient = 'myterapiacc@gmail.com'
where kind = 'practitioner_notice'
  and status in ('pending', 'processing', 'failed');

comment on table public.calendar_outbox is
  'Server-only durable Google Calendar event jobs for confirmed appointments.';
