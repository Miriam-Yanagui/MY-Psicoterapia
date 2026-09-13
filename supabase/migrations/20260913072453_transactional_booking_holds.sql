-- Batch 4B-2: atomic, idempotent booking hold acquisition.

alter table public.appointments
  add column hold_idempotency_key uuid;

create unique index appointments_hold_idempotency_key_idx
  on public.appointments (hold_idempotency_key)
  where hold_idempotency_key is not null;

create or replace function public.acquire_booking_hold(
  p_slot_id uuid,
  p_idempotency_key uuid
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
    amount_minor,
    currency
  ) values (
    p_slot_id,
    'held'::public.appointment_status,
    v_now + interval '5 minutes',
    p_idempotency_key,
    80000,
    'MXN'
  )
  returning public.appointments.* into v_existing;

  return query
    select 'held', null::text, v_existing.id, v_existing.slot_id, v_existing.hold_expires_at, false;
end;
$$;

revoke all on function public.acquire_booking_hold(uuid, uuid) from public, anon, authenticated;
grant execute on function public.acquire_booking_hold(uuid, uuid) to service_role;

comment on column public.appointments.hold_idempotency_key is
  'Server-side idempotency key for booking hold acquisition.';
comment on function public.acquire_booking_hold(uuid, uuid) is
  'Atomically acquires or replays a five-minute booking hold; server-side only.';
