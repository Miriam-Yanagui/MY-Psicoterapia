-- Ticket checkout: consent is captured before opening the payment Brick, while
-- the payer email is captured by Mercado Pago's secure form. Phone is optional.

alter table public.appointments
  drop constraint appointments_contact_all_or_none,
  add constraint appointments_contact_consistent check (
    ((consent_version is null) = (consented_at is null))
    and (email is null or consented_at is not null)
    and (
      (country_code is null and phone is null)
      or
      (country_code is not null and phone is not null and email is not null and consented_at is not null)
    )
  );

create function public.save_booking_consent(
  p_booking_access_token_hash text,
  p_consent_version text
)
returns table (
  result_status text,
  result_code text,
  appointment_id uuid,
  hold_expires_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_appointment public.appointments%rowtype;
begin
  select a.* into v_appointment
    from public.appointments a
   where a.booking_access_token_hash = p_booking_access_token_hash
   for update;

  if not found then
    return query select 'unauthorized', 'BOOKING_NOT_FOUND', null::uuid, null::timestamptz;
    return;
  end if;

  if v_appointment.status in ('held', 'payment_pending')
     and v_appointment.hold_expires_at <= v_now then
    update public.appointments set status = 'expired', hold_expires_at = null,
      booking_access_token_hash = null, updated_at = v_now where id = v_appointment.id;
    return query select 'unavailable', 'HOLD_EXPIRED', null::uuid, null::timestamptz;
    return;
  end if;

  if v_appointment.status not in ('held', 'payment_pending') then
    return query select 'unavailable', 'BOOKING_NOT_ACTIVE', null::uuid, null::timestamptz;
    return;
  end if;

  update public.appointments set consent_version = p_consent_version,
    consented_at = coalesce(consented_at, v_now), updated_at = v_now
   where id = v_appointment.id;

  return query select 'saved', null::text, v_appointment.id, v_appointment.hold_expires_at;
end;
$$;

revoke all on function public.save_booking_consent(text, text) from public, anon, authenticated;
grant execute on function public.save_booking_consent(text, text) to service_role;

create function public.begin_payment_attempt_with_email(
  p_booking_access_token_hash text,
  p_requested_idempotency_key uuid,
  p_payer_email text
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

  if v_appointment.status = 'held' and v_appointment.hold_expires_at <= v_now then
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

  if v_appointment.consented_at is null
     or lower(btrim(p_payer_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     or length(p_payer_email) > 254 then
    return query select 'unavailable', 'CONTACT_REQUIRED', null::uuid, null::uuid,
      null::text, null::integer, null::char(3), null::text, null::public.payment_status, false;
    return;
  end if;

  if v_appointment.email is null then
    update public.appointments set email = lower(btrim(p_payer_email)), updated_at = v_now
     where id = v_appointment.id returning * into v_appointment;
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
    if v_appointment.status = 'payment_pending' and v_appointment.hold_expires_at <= v_now then
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

revoke all on function public.begin_payment_attempt_with_email(text, uuid, text) from public, anon, authenticated;
grant execute on function public.begin_payment_attempt_with_email(text, uuid, text) to service_role;

create or replace function public.acquire_booking_hold(
  p_slot_id uuid,
  p_idempotency_key uuid,
  p_booking_access_token_hash text
)
returns table (
  result_status text,
  result_code text,
  appointment_id uuid,
  slot_id uuid,
  hold_expires_at timestamptz,
  replayed boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_slot_status public.slot_availability_status;
  v_existing public.appointments%rowtype;
begin
  if p_booking_access_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid booking access token hash'; end if;
  select s.availability_status into v_slot_status from public.slots s where s.id = p_slot_id for update;
  if not found then return query select 'unavailable', 'SLOT_NOT_FOUND', null::uuid, p_slot_id, null::timestamptz, false; return; end if;
  if v_slot_status <> 'open' then return query select 'unavailable', 'SLOT_NOT_OPEN', null::uuid, p_slot_id, null::timestamptz, false; return; end if;

  update public.appointments set status = 'expired', hold_expires_at = null,
    booking_access_token_hash = null, updated_at = v_now
   where slot_id = p_slot_id and status in ('held', 'payment_pending') and hold_expires_at <= v_now;

  select a.* into v_existing from public.appointments a where a.hold_idempotency_key = p_idempotency_key;
  if found then
    if v_existing.slot_id = p_slot_id and v_existing.status in ('held', 'payment_pending') and v_existing.hold_expires_at > v_now then
      update public.appointments set booking_access_token_hash = p_booking_access_token_hash, updated_at = v_now where id = v_existing.id;
      return query select 'held', null::text, v_existing.id, v_existing.slot_id, v_existing.hold_expires_at, true;
    elsif v_existing.slot_id = p_slot_id and v_existing.status = 'expired' then
      return query select 'unavailable', 'HOLD_EXPIRED', null::uuid, p_slot_id, null::timestamptz, true;
    else
      return query select 'unavailable', 'SLOT_UNAVAILABLE', null::uuid, p_slot_id, null::timestamptz, true;
    end if;
    return;
  end if;

  if exists (select 1 from public.appointments a where a.slot_id = p_slot_id and a.status in ('held', 'payment_pending', 'confirmed')) then
    return query select 'unavailable', 'SLOT_UNAVAILABLE', null::uuid, p_slot_id, null::timestamptz, false;
    return;
  end if;

  insert into public.appointments (
    slot_id, status, hold_expires_at, hold_idempotency_key,
    booking_access_token_hash, amount_minor, currency
  ) values (
    p_slot_id, 'held', v_now + interval '5 minutes', p_idempotency_key,
    p_booking_access_token_hash, 80000, 'MXN'
  ) returning * into v_existing;

  return query select 'held', null::text, v_existing.id, v_existing.slot_id, v_existing.hold_expires_at, false;
end;
$$;

revoke all on function public.acquire_booking_hold(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.acquire_booking_hold(uuid, uuid, text) to service_role;

comment on function public.acquire_booking_hold(uuid, uuid, text) is
  'Atomically acquires or replays a hold; new appointments use the MXN 800 session price.';
