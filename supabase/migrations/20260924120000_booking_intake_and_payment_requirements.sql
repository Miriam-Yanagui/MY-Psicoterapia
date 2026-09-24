-- Intake contains sensitive answers, kept apart from operational appointment data.
create table public.booking_intake (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  emotion text not null check (emotion in ('Bien','Preocupado/a','Cansado/a','Con estrés','Triste','Frustrado/a','Pensativo/a','No estoy seguro/a')),
  therapy_experience text not null check (therapy_experience in ('Primera vez','He asistido antes','Estoy retomándola')),
  goals text[] not null check (cardinality(goals) between 1 and 6),
  goals_additional_notes text check (length(goals_additional_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_intake enable row level security;
revoke all on public.booking_intake from public, anon, authenticated;
grant select, insert, update on public.booking_intake to service_role;

create function public.save_booking_intake(
  p_booking_access_token_hash text, p_name text, p_emotion text,
  p_therapy_experience text, p_goals text[], p_goals_additional_notes text
)
returns table (result_status text, result_code text)
language plpgsql security invoker set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
begin
  select a.* into v_appointment from public.appointments a
    where a.booking_access_token_hash = p_booking_access_token_hash for update;
  if not found then
    return query select 'unavailable'::text, 'BOOKING_NOT_FOUND'::text; return;
  end if;
  if v_appointment.status <> 'held' or v_appointment.hold_expires_at <= now() then
    return query select 'unavailable'::text,
      case when v_appointment.hold_expires_at <= now() then 'HOLD_EXPIRED' else 'BOOKING_NOT_ACTIVE' end::text;
    return;
  end if;
  if length(btrim(p_name)) not between 1 and 120 or p_emotion not in
      ('Bien','Preocupado/a','Cansado/a','Con estrés','Triste','Frustrado/a','Pensativo/a','No estoy seguro/a')
    or p_therapy_experience not in ('Primera vez','He asistido antes','Estoy retomándola')
    or cardinality(p_goals) not between 1 and 6
    or exists (select 1 from unnest(p_goals) g where g is null or g not in
      ('Entender lo que siento','Sentirme con más calma','Mejorar mis relaciones','Atravesar un cambio','Conocerme mejor','Prefiero hablarlo en sesión'))
    or (select count(distinct g) from unnest(p_goals) g) <> cardinality(p_goals)
    or length(p_goals_additional_notes) > 2000 then
    return query select 'unavailable'::text, 'INVALID_INTAKE'::text; return;
  end if;
  insert into public.booking_intake as i
    (appointment_id, name, emotion, therapy_experience, goals, goals_additional_notes)
    values (v_appointment.id, btrim(p_name), p_emotion, p_therapy_experience, p_goals,
      nullif(btrim(p_goals_additional_notes), ''))
    on conflict (appointment_id) do update set
      name = excluded.name, emotion = excluded.emotion,
      therapy_experience = excluded.therapy_experience, goals = excluded.goals,
      goals_additional_notes = excluded.goals_additional_notes, updated_at = now();
  return query select 'saved'::text, null::text;
end;
$$;
revoke all on function public.save_booking_intake(text,text,text,text,text[],text) from public, anon, authenticated;
grant execute on function public.save_booking_intake(text,text,text,text,text[],text) to service_role;

-- Gate atomically inside the payment transaction, including direct API calls.
create or replace function public.begin_payment_attempt_with_email(
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

  if not exists (select 1 from public.booking_intake i where i.appointment_id = v_appointment.id) then
    return query select 'unavailable', 'INTAKE_REQUIRED', null::uuid, null::uuid,
      null::text, null::integer, null::char(3), null::text, null::public.payment_status, false;
    return;
  end if;

  if v_appointment.consented_at is null or v_appointment.consent_version is null
     or v_appointment.email is null or v_appointment.country_code is null or v_appointment.phone is null
     or btrim(v_appointment.email) = '' or btrim(v_appointment.phone) = ''
     or lower(btrim(p_payer_email)) <> lower(v_appointment.email)
     or lower(btrim(p_payer_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     or length(p_payer_email) > 254 then
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

