-- Require appointments to be booked at least 24 hours before the slot starts.
-- Existing appointments and slots are preserved.

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
  v_slot_starts_at timestamptz;
  v_existing public.appointments%rowtype;
begin
  if p_booking_access_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid booking access token hash'; end if;

  select s.availability_status, s.starts_at
    into v_slot_status, v_slot_starts_at
    from public.slots s
   where s.id = p_slot_id
   for update;

  if not found then return query select 'unavailable', 'SLOT_NOT_FOUND', null::uuid, p_slot_id, null::timestamptz, false; return; end if;
  if v_slot_status <> 'open' then return query select 'unavailable', 'SLOT_NOT_OPEN', null::uuid, p_slot_id, null::timestamptz, false; return; end if;

  update public.appointments as a set status = 'expired', hold_expires_at = null,
    booking_access_token_hash = null, updated_at = v_now
   where a.slot_id = p_slot_id and a.status in ('held', 'payment_pending') and a.hold_expires_at <= v_now;

  select a.* into v_existing from public.appointments a where a.hold_idempotency_key = p_idempotency_key;
  if found then
    if v_existing.slot_id = p_slot_id and v_existing.status in ('held', 'payment_pending') and v_existing.hold_expires_at > v_now then
      update public.appointments as a set booking_access_token_hash = p_booking_access_token_hash, updated_at = v_now where a.id = v_existing.id;
      return query select 'held', null::text, v_existing.id, v_existing.slot_id, v_existing.hold_expires_at, true;
    elsif v_existing.slot_id = p_slot_id and v_existing.status = 'expired' then
      return query select 'unavailable', 'HOLD_EXPIRED', null::uuid, p_slot_id, null::timestamptz, true;
    else
      return query select 'unavailable', 'SLOT_UNAVAILABLE', null::uuid, p_slot_id, null::timestamptz, true;
    end if;
    return;
  end if;

  if v_slot_starts_at < v_now + interval '24 hours' then
    return query select 'unavailable', 'SLOT_TOO_SOON', null::uuid, p_slot_id, null::timestamptz, false;
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
  'Atomically acquires or replays a hold and requires new bookings at least 24 hours before the slot starts.';
