-- Batch 4B-5: signed Orders webhooks and authoritative booking confirmation.

alter type public.payment_status add value if not exists 'approved';

alter table public.payments add column approved_at timestamptz;

create function private.protect_payment_pending_appointment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'payment_pending'::public.appointment_status
     and new.status = 'expired'::public.appointment_status
     and exists (
       select 1 from public.payments p
        where p.appointment_id = old.id
          and p.status::text <> 'rejected'
     ) then
    return null;
  end if;
  return new;
end;
$$;

create trigger appointments_protect_payment_pending
before update of status on public.appointments
for each row execute function private.protect_payment_pending_appointment();

revoke all on function private.protect_payment_pending_appointment() from public, anon, authenticated;

create or replace function public.begin_payment_attempt(
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

  if v_appointment.status = 'held'::public.appointment_status
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
   where p.appointment_id = v_appointment.id and p.status::text <> 'rejected'
   for update;

  if found then
    if v_payment.status::text in ('pending', 'processing', 'approved_provisional', 'approved') then
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
    if v_appointment.status = 'payment_pending'::public.appointment_status
       and v_appointment.hold_expires_at <= v_now then
      return query select 'unavailable', 'HOLD_EXPIRED', null::uuid, null::uuid,
        null::text, null::integer, null::char(3), null::text, null::public.payment_status, false;
      return;
    end if;
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

create function public.reconcile_mercado_pago_order(
  p_provider_order_id text,
  p_external_reference text,
  p_provider_payment_id text,
  p_order_type text,
  p_processing_mode text,
  p_order_status text,
  p_order_status_detail text,
  p_transaction_status text,
  p_transaction_status_detail text,
  p_total_amount_minor integer,
  p_transaction_amount_minor integer,
  p_paid_amount_minor integer,
  p_country_code text,
  p_provider_updated_at timestamptz
)
returns table (result_status text, result_code text, appointment_id uuid, payment_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_appointment_id uuid;
  v_appointment public.appointments%rowtype;
  v_payment public.payments%rowtype;
  v_is_approved boolean;
  v_is_rejected boolean;
  v_safe_detail text;
begin
  select p.appointment_id into v_appointment_id
    from public.payments p
   where p.provider = 'mercado_pago'
     and (p.provider_order_id = p_provider_order_id or p.external_reference = p_external_reference)
   limit 1;
  if not found then
    return query select 'ignored', 'UNKNOWN_ORDER', null::uuid, null::uuid;
    return;
  end if;

  select a.* into v_appointment from public.appointments a
   where a.id = v_appointment_id for update;
  select p.* into v_payment from public.payments p
   where p.appointment_id = v_appointment.id
     and (p.provider_order_id = p_provider_order_id or p.external_reference = p_external_reference)
   for update;
  if not found then
    return query select 'ignored', 'PAYMENT_RELATION_MISMATCH', v_appointment.id, null::uuid;
    return;
  end if;

  if v_payment.external_reference <> p_external_reference
     or (v_payment.provider_order_id is not null and v_payment.provider_order_id <> p_provider_order_id)
     or (v_payment.provider_payment_id is not null and v_payment.provider_payment_id <> p_provider_payment_id)
     or v_payment.amount_minor <> p_total_amount_minor
     or v_payment.amount_minor <> p_transaction_amount_minor
     or v_payment.amount_minor <> p_paid_amount_minor
     or v_appointment.amount_minor <> v_payment.amount_minor
     or v_appointment.currency <> 'MXN'
     or v_payment.currency <> 'MXN'
     or p_order_type <> 'online'
     or p_processing_mode <> 'automatic'
     or (p_country_code is not null and p_country_code <> 'MX') then
    return query select 'ignored', 'AUTHORITATIVE_MISMATCH', v_appointment.id, v_payment.id;
    return;
  end if;

  v_is_approved := p_order_status = 'processed' and p_order_status_detail = 'accredited'
    and p_transaction_status = 'processed' and p_transaction_status_detail = 'accredited';
  v_is_rejected := p_order_status in ('failed', 'canceled', 'expired')
    and p_transaction_status in ('failed', 'canceled', 'expired');
  v_safe_detail := left(p_order_status || ':' || p_order_status_detail || '/' ||
    p_transaction_status || ':' || p_transaction_status_detail, 120);

  if v_payment.status::text = 'approved' then
    return query select 'duplicate', null::text, v_appointment.id, v_payment.id;
    return;
  end if;

  update public.payments set
    provider_order_id = p_provider_order_id,
    provider_payment_id = p_provider_payment_id,
    status_detail = v_safe_detail,
    provider_updated_at = coalesce(p_provider_updated_at, v_now),
    processing_started_at = null
   where id = v_payment.id;

  if v_is_approved then
    if v_appointment.status <> 'payment_pending'::public.appointment_status then
      return query select 'ignored', 'BOOKING_NOT_PAYMENT_PENDING', v_appointment.id, v_payment.id;
      return;
    end if;
    execute 'update public.payments set status = $1::public.payment_status, approved_at = $2 where id = $3'
      using 'approved', v_now, v_payment.id;
    update public.appointments set status = 'confirmed', confirmed_at = v_now,
      hold_expires_at = null where id = v_appointment.id;
    return query select 'confirmed', null::text, v_appointment.id, v_payment.id;
    return;
  end if;

  if v_is_rejected then
    update public.payments set status = 'rejected' where id = v_payment.id;
    if v_appointment.status = 'payment_pending'::public.appointment_status then
      if v_appointment.hold_expires_at > v_now then
        update public.appointments set status = 'held' where id = v_appointment.id;
      else
        update public.appointments set status = 'expired', hold_expires_at = null,
          booking_access_token_hash = null where id = v_appointment.id;
      end if;
    end if;
    return query select 'rejected', null::text, v_appointment.id, v_payment.id;
    return;
  end if;

  if p_order_status = 'action_required' or p_transaction_status = 'action_required' then
    update public.payments set status = 'pending' where id = v_payment.id;
    return query select 'pending', null::text, v_appointment.id, v_payment.id;
  end if;

  if p_order_status in ('created', 'processing')
     or p_transaction_status in ('created', 'processing', 'in_review') then
    update public.payments set status = 'processing' where id = v_payment.id;
    return query select 'processing', null::text, v_appointment.id, v_payment.id;
  end if;

  return query select 'ignored', 'UNSUPPORTED_PROVIDER_STATE', v_appointment.id, v_payment.id;
end;
$$;

revoke all on function public.reconcile_mercado_pago_order(text, text, text, text, text, text, text, text, text, integer, integer, integer, text, timestamptz) from public, anon, authenticated;
grant execute on function public.reconcile_mercado_pago_order(text, text, text, text, text, text, text, text, text, integer, integer, integer, text, timestamptz) to service_role;

comment on function public.reconcile_mercado_pago_order(text, text, text, text, text, text, text, text, text, integer, integer, integer, text, timestamptz) is
  'Atomically applies an allowlisted, server-fetched Mercado Pago Order snapshot; server-side only.';
comment on column public.payments.approved_at is
  'Timestamp when a server-to-server Orders lookup verified processed/accredited.';
