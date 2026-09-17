create or replace function public.reconcile_mercado_pago_order(
  p_provider_order_id text, p_external_reference text, p_provider_payment_id text,
  p_order_type text, p_processing_mode text, p_order_status text, p_order_status_detail text,
  p_transaction_status text, p_transaction_status_detail text,
  p_total_amount_minor integer, p_transaction_amount_minor integer, p_paid_amount_minor integer,
  p_country_code text, p_provider_updated_at timestamptz
)
returns table (result_status text, result_code text, appointment_id uuid, payment_id uuid)
language plpgsql security invoker set search_path = ''
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
  select p.appointment_id into v_appointment_id from public.payments p
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

  v_is_approved := p_order_status = 'processed' and p_order_status_detail = 'accredited'
    and p_transaction_status = 'processed' and p_transaction_status_detail = 'accredited';
  v_is_rejected := p_order_status in ('failed', 'canceled', 'expired')
    and p_transaction_status in ('failed', 'canceled', 'expired');

  if v_payment.external_reference <> p_external_reference
     or (v_payment.provider_order_id is not null and v_payment.provider_order_id <> p_provider_order_id)
     or (v_payment.provider_payment_id is not null and v_payment.provider_payment_id <> p_provider_payment_id)
     or v_payment.amount_minor <> p_total_amount_minor
     or v_payment.amount_minor <> p_transaction_amount_minor
     or (v_is_approved and v_payment.amount_minor <> p_paid_amount_minor)
     or v_appointment.amount_minor <> v_payment.amount_minor
     or v_appointment.currency <> 'MXN'
     or v_payment.currency <> 'MXN'
     or p_order_type <> 'online'
     or p_processing_mode <> 'automatic'
     or (p_country_code is not null and p_country_code not in ('MX', 'MEX')) then
    return query select 'ignored', 'AUTHORITATIVE_MISMATCH', v_appointment.id, v_payment.id;
    return;
  end if;

  v_safe_detail := left(p_order_status || ':' || p_order_status_detail || '/' ||
    p_transaction_status || ':' || p_transaction_status_detail, 120);
  if v_payment.status::text = 'approved' then
    return query select 'duplicate', null::text, v_appointment.id, v_payment.id;
    return;
  end if;

  update public.payments set provider_order_id = p_provider_order_id,
    provider_payment_id = p_provider_payment_id, status_detail = v_safe_detail,
    provider_updated_at = coalesce(p_provider_updated_at, v_now), processing_started_at = null
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
    return;
  end if;
  if p_order_status in ('created', 'processing')
     or p_transaction_status in ('created', 'processing', 'in_review') then
    update public.payments set status = 'processing' where id = v_payment.id;
    return query select 'processing', null::text, v_appointment.id, v_payment.id;
    return;
  end if;
  return query select 'ignored', 'UNSUPPORTED_PROVIDER_STATE', v_appointment.id, v_payment.id;
end;
$$;

revoke all on function public.reconcile_mercado_pago_order(text, text, text, text, text, text, text, text, text, integer, integer, integer, text, timestamptz) from public, anon, authenticated;
grant execute on function public.reconcile_mercado_pago_order(text, text, text, text, text, text, text, text, text, integer, integer, integer, text, timestamptz) to service_role;

comment on function public.reconcile_mercado_pago_order(text, text, text, text, text, text, text, text, text, integer, integer, integer, text, timestamptz) is
  'Authoritatively reconciles a Mercado Pago Order. Accepts both ISO alpha-2 MX and provider alpha-3 MEX country codes.';
