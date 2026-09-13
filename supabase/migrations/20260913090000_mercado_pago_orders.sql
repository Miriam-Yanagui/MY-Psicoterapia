-- Batch 4B-4: Mercado Pago Orders payment attempts. No webhook or booking confirmation.

create type public.payment_status as enum (
  'created',
  'submitting',
  'uncertain',
  'processing',
  'pending',
  'approved_provisional',
  'rejected'
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  provider text not null default 'mercado_pago',
  attempt_no smallint not null,
  idempotency_key uuid not null unique,
  external_reference text not null unique,
  provider_order_id text,
  provider_payment_id text,
  amount_minor integer not null,
  currency char(3) not null,
  status public.payment_status not null default 'created',
  status_detail text,
  processing_started_at timestamptz,
  provider_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_appointment_attempt_unique unique (appointment_id, attempt_no),
  constraint payments_amount_positive check (amount_minor > 0),
  constraint payments_currency_mxn check (currency = 'MXN'),
  constraint payments_provider_mercado_pago check (provider = 'mercado_pago'),
  constraint payments_status_detail_length check (status_detail is null or length(status_detail) <= 120)
);

create unique index payments_provider_order_id_idx
  on public.payments (provider_order_id) where provider_order_id is not null;
create unique index payments_provider_payment_id_idx
  on public.payments (provider_payment_id) where provider_payment_id is not null;
create index payments_appointment_created_at_idx
  on public.payments (appointment_id, created_at desc);
create unique index payments_one_unresolved_attempt_per_appointment_idx
  on public.payments (appointment_id) where status <> 'rejected';

create trigger payments_set_updated_at
before update on public.payments
for each row execute function private.set_updated_at();

alter table public.payments enable row level security;
alter table public.payments force row level security;
revoke all on table public.payments from anon, authenticated;
grant select, insert, update, delete on table public.payments to service_role;

create function public.begin_payment_attempt(
  p_booking_access_token_hash text,
  p_requested_idempotency_key uuid
)
returns table (
  result_status text,
  result_code text,
  payment_id uuid,
  provider_idempotency_key uuid,
  external_reference text,
  amount_minor integer,
  currency char(3),
  payer_email text,
  payment_status public.payment_status,
  should_submit boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_appointment public.appointments%rowtype;
  v_payment public.payments%rowtype;
  v_attempt_no smallint;
begin
  select a.* into v_appointment
    from public.appointments a
   where a.booking_access_token_hash = p_booking_access_token_hash
   for update;

  if not found then
    return query select 'unavailable', 'BOOKING_NOT_FOUND', null::uuid, null::uuid,
      null::text, null::integer, null::char(3), null::text, null::public.payment_status, false;
    return;
  end if;

  if v_appointment.status in ('held', 'payment_pending')
     and v_appointment.hold_expires_at <= v_now then
    update public.appointments set status = 'expired', hold_expires_at = null,
      booking_access_token_hash = null where id = v_appointment.id;
    return query select 'unavailable', 'HOLD_EXPIRED', null::uuid, null::uuid,
      null::text, null::integer, null::char(3), null::text, null::public.payment_status, false;
    return;
  end if;

  if v_appointment.status not in ('held', 'payment_pending') then
    return query select 'unavailable', 'BOOKING_NOT_ACTIVE', null::uuid, null::uuid,
      null::text, null::integer, null::char(3), null::text, null::public.payment_status, false;
    return;
  end if;

  if v_appointment.email is null or v_appointment.consented_at is null then
    return query select 'unavailable', 'CONTACT_REQUIRED', null::uuid, null::uuid,
      null::text, null::integer, null::char(3), null::text, null::public.payment_status, false;
    return;
  end if;

  select p.* into v_payment from public.payments p
   where p.idempotency_key = p_requested_idempotency_key for update;
  if found and v_payment.appointment_id = v_appointment.id and v_payment.status = 'rejected' then
    return query select 'rejected', null::text, v_payment.id, v_payment.idempotency_key,
      v_payment.external_reference, v_payment.amount_minor, v_payment.currency,
      v_appointment.email, v_payment.status, false;
    return;
  end if;

  select p.* into v_payment from public.payments p
   where p.appointment_id = v_appointment.id and p.status <> 'rejected'
   for update;

  if found then
    if v_payment.status in ('pending', 'processing', 'approved_provisional') then
      return query select 'existing', null::text, v_payment.id, v_payment.idempotency_key,
        v_payment.external_reference, v_payment.amount_minor, v_payment.currency,
        v_appointment.email, v_payment.status, false;
      return;
    end if;
    if v_payment.status = 'submitting'
       and v_payment.processing_started_at > v_now - interval '30 seconds' then
      return query select 'busy', 'PAYMENT_IN_PROGRESS', v_payment.id, v_payment.idempotency_key,
        v_payment.external_reference, v_payment.amount_minor, v_payment.currency,
        v_appointment.email, v_payment.status, false;
      return;
    end if;
    update public.payments set status = 'submitting', processing_started_at = v_now
     where id = v_payment.id returning * into v_payment;
  else
    select coalesce(max(p.attempt_no), 0) + 1 into v_attempt_no
      from public.payments p where p.appointment_id = v_appointment.id;
    insert into public.payments (
      appointment_id, attempt_no, idempotency_key, external_reference,
      amount_minor, currency, status, processing_started_at
    ) values (
      v_appointment.id, v_attempt_no, p_requested_idempotency_key,
      'miriam-payment-' || gen_random_uuid()::text,
      v_appointment.amount_minor, v_appointment.currency, 'submitting', v_now
    ) returning * into v_payment;
  end if;

  update public.appointments set status = 'payment_pending' where id = v_appointment.id;
  return query select 'ready', null::text, v_payment.id, v_payment.idempotency_key,
    v_payment.external_reference, v_payment.amount_minor, v_payment.currency,
    v_appointment.email, v_payment.status, true;
end;
$$;

create function public.finish_payment_attempt(
  p_booking_access_token_hash text,
  p_payment_id uuid,
  p_status public.payment_status,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_status_detail text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_appointment public.appointments%rowtype;
begin
  if p_status not in ('uncertain', 'processing', 'pending', 'approved_provisional', 'rejected') then
    raise exception 'invalid terminal payment status';
  end if;
  select a.* into v_appointment from public.appointments a
   where a.booking_access_token_hash = p_booking_access_token_hash for update;
  if not found then raise exception 'booking not found'; end if;

  update public.payments set status = p_status,
    provider_order_id = coalesce(p_provider_order_id, provider_order_id),
    provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
    status_detail = left(p_status_detail, 120), processing_started_at = null,
    provider_updated_at = v_now
   where id = p_payment_id and appointment_id = v_appointment.id;
  if not found then raise exception 'payment not found'; end if;

  if p_status = 'rejected' then
    if v_appointment.hold_expires_at > v_now then
      update public.appointments set status = 'held' where id = v_appointment.id;
    else
      update public.appointments set status = 'expired', hold_expires_at = null,
        booking_access_token_hash = null where id = v_appointment.id;
    end if;
  else
    update public.appointments set status = 'payment_pending' where id = v_appointment.id;
  end if;
end;
$$;

revoke all on function public.begin_payment_attempt(text, uuid) from public, anon, authenticated;
revoke all on function public.finish_payment_attempt(text, uuid, public.payment_status, text, text, text) from public, anon, authenticated;
grant execute on function public.begin_payment_attempt(text, uuid) to service_role;
grant execute on function public.finish_payment_attempt(text, uuid, public.payment_status, text, text, text) to service_role;

comment on table public.payments is 'Allowlisted Mercado Pago Orders metadata; no card data or provider payloads.';
