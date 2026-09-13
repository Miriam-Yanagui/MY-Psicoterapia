-- Batch 4B-3: opaque, server-managed booking recovery and contact persistence.

alter table public.appointments
  drop constraint appointments_country_code_format,
  add constraint appointments_country_code_format
    check (country_code is null or country_code ~ '^[+][1-9][0-9]{0,3}$'),
  drop constraint appointments_phone_e164_format,
  add constraint appointments_phone_e164_format
    check (phone is null or phone ~ '^[+][1-9][0-9]{7,14}$');

alter table public.appointments
  add column booking_access_token_hash text;

alter table public.appointments
  add constraint appointments_booking_access_token_hash_format
  check (
    booking_access_token_hash is null
    or booking_access_token_hash ~ '^[0-9a-f]{64}$'
  );

create unique index appointments_booking_access_token_hash_idx
  on public.appointments (booking_access_token_hash)
  where booking_access_token_hash is not null;

drop function public.acquire_booking_hold(uuid, uuid);

create function public.acquire_booking_hold(
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
  if p_booking_access_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid booking access token hash';
  end if;

  select s.availability_status
    into v_slot_status
    from public.slots as s
   where s.id = p_slot_id
   for update;

  if not found then
    return query select 'unavailable', 'SLOT_NOT_FOUND', null::uuid, p_slot_id, null::timestamptz, false;
    return;
  end if;

  if v_slot_status <> 'open'::public.slot_availability_status then
    return query select 'unavailable', 'SLOT_NOT_OPEN', null::uuid, p_slot_id, null::timestamptz, false;
    return;
  end if;

  update public.appointments as a
     set status = 'expired'::public.appointment_status,
         hold_expires_at = null,
         booking_access_token_hash = null,
         updated_at = v_now
   where a.slot_id = p_slot_id
     and a.status in ('held'::public.appointment_status, 'payment_pending'::public.appointment_status)
     and a.hold_expires_at <= v_now;

  select a.*
    into v_existing
    from public.appointments as a
   where a.hold_idempotency_key = p_idempotency_key;

  if found then
    if v_existing.slot_id = p_slot_id
       and v_existing.status in ('held'::public.appointment_status, 'payment_pending'::public.appointment_status)
       and v_existing.hold_expires_at > v_now then
      update public.appointments as a
         set booking_access_token_hash = p_booking_access_token_hash,
             updated_at = v_now
       where a.id = v_existing.id;
      return query
        select 'held', null::text, v_existing.id, v_existing.slot_id, v_existing.hold_expires_at, true;
    elsif v_existing.slot_id = p_slot_id
       and v_existing.status = 'expired'::public.appointment_status then
      return query select 'unavailable', 'HOLD_EXPIRED', null::uuid, p_slot_id, null::timestamptz, true;
    else
      return query select 'unavailable', 'SLOT_UNAVAILABLE', null::uuid, p_slot_id, null::timestamptz, true;
    end if;
    return;
  end if;

  if exists (
    select 1
      from public.appointments as a
     where a.slot_id = p_slot_id
       and a.status in (
         'held'::public.appointment_status,
         'payment_pending'::public.appointment_status,
         'confirmed'::public.appointment_status
       )
  ) then
    return query select 'unavailable', 'SLOT_UNAVAILABLE', null::uuid, p_slot_id, null::timestamptz, false;
    return;
  end if;

  insert into public.appointments (
    slot_id,
    status,
    hold_expires_at,
    hold_idempotency_key,
    booking_access_token_hash,
    amount_minor,
    currency
  ) values (
    p_slot_id,
    'held'::public.appointment_status,
    v_now + interval '5 minutes',
    p_idempotency_key,
    p_booking_access_token_hash,
    80000,
    'MXN'
  )
  returning public.appointments.* into v_existing;

  return query
    select 'held', null::text, v_existing.id, v_existing.slot_id, v_existing.hold_expires_at, false;
end;
$$;

revoke all on function public.acquire_booking_hold(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.acquire_booking_hold(uuid, uuid, text) to service_role;

create function public.save_booking_contact(
  p_booking_access_token_hash text,
  p_email text,
  p_country_code text,
  p_phone text,
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
  select a.*
    into v_appointment
    from public.appointments as a
   where a.booking_access_token_hash = p_booking_access_token_hash
   for update;

  if not found then
    return query select 'unauthorized', 'BOOKING_NOT_FOUND', null::uuid, null::timestamptz;
    return;
  end if;

  if v_appointment.status in ('held'::public.appointment_status, 'payment_pending'::public.appointment_status)
     and v_appointment.hold_expires_at <= v_now then
    update public.appointments as a
       set status = 'expired'::public.appointment_status,
           hold_expires_at = null,
           booking_access_token_hash = null,
           updated_at = v_now
     where a.id = v_appointment.id;
    return query select 'unavailable', 'HOLD_EXPIRED', null::uuid, null::timestamptz;
    return;
  end if;

  if v_appointment.status not in ('held'::public.appointment_status, 'payment_pending'::public.appointment_status) then
    return query select 'unavailable', 'BOOKING_NOT_ACTIVE', null::uuid, null::timestamptz;
    return;
  end if;

  update public.appointments as a
     set email = lower(btrim(p_email)),
         country_code = p_country_code,
         phone = p_phone,
         consent_version = p_consent_version,
         consented_at = v_now,
         updated_at = v_now
   where a.id = v_appointment.id;

  return query select 'saved', null::text, v_appointment.id, v_appointment.hold_expires_at;
end;
$$;

revoke all on function public.save_booking_contact(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.save_booking_contact(text, text, text, text, text) to service_role;

comment on column public.appointments.booking_access_token_hash is
  'SHA-256 hash of the opaque HttpOnly booking recovery credential; raw tokens are never stored.';
comment on function public.acquire_booking_hold(uuid, uuid, text) is
  'Atomically acquires or replays a hold and rotates its recovery-token hash; server-side only.';
comment on function public.save_booking_contact(text, text, text, text, text) is
  'Persists normalized operational contact data for an authorized, unexpired booking; server-side only.';
