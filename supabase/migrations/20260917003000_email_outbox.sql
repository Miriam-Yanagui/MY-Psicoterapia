-- Durable transactional email outbox. Confirmation jobs are inserted in the
-- same database transaction that confirms an appointment.

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  kind text not null check (kind in ('patient_confirmation', 'practitioner_notice')),
  recipient text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts smallint not null default 0 check (attempts between 0 and 12),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_outbox_recipient_required check (
    (kind = 'patient_confirmation' and recipient is not null)
    or kind = 'practitioner_notice'
  ),
  constraint email_outbox_unique_appointment_kind unique (appointment_id, kind)
);

create index email_outbox_pending_idx
  on public.email_outbox (status, next_attempt_at, created_at)
  where status in ('pending', 'processing');

create trigger email_outbox_set_updated_at
before update on public.email_outbox
for each row execute function private.set_updated_at();

alter table public.email_outbox enable row level security;
alter table public.email_outbox force row level security;
revoke all on table public.email_outbox from public, anon, authenticated;
grant select, insert, update, delete on table public.email_outbox to service_role;

create function private.enqueue_confirmed_appointment_emails()
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
      (new.id, 'practitioner_notice', null)
    on conflict (appointment_id, kind) do nothing;
  end if;
  return new;
end;
$$;

create trigger appointments_enqueue_confirmation_emails
after update of status on public.appointments
for each row execute function private.enqueue_confirmed_appointment_emails();

revoke all on function private.enqueue_confirmed_appointment_emails() from public, anon, authenticated;

comment on table public.email_outbox is
  'Server-only durable jobs for transactional appointment emails; contains contact data.';
