-- RETURN QUERY appends rows; explicitly exit after intermediate-state results so
-- every RPC invocation returns exactly one reconciliation outcome.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.reconcile_mercado_pago_order(text,text,text,text,text,text,text,text,text,integer,integer,integer,text,timestamptz)'::regprocedure
  ) into v_definition;
  v_definition := replace(
    v_definition,
    $old$    return query select 'pending', null::text, v_appointment.id, v_payment.id;
  end if;$old$,
    $new$    return query select 'pending', null::text, v_appointment.id, v_payment.id;
    return;
  end if;$new$
  );
  v_definition := replace(
    v_definition,
    $old$    return query select 'processing', null::text, v_appointment.id, v_payment.id;
  end if;$old$,
    $new$    return query select 'processing', null::text, v_appointment.id, v_payment.id;
    return;
  end if;$new$
  );
  execute v_definition;
end;
$$;
