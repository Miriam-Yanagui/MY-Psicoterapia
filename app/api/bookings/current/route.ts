import { NextRequest, NextResponse } from "next/server";
import {
  BOOKING_SESSION_COOKIE,
  clearBookingSessionCookie,
  hashBookingRecoverySecret,
} from "@/lib/booking-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reconcileMercadoPagoOrder } from "@/lib/mercado-pago/reconcile";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = request.cookies.get(BOOKING_SESSION_COOKIE)?.value;
  if (!secret) return NextResponse.json({ code: "BOOKING_NOT_FOUND" }, { status: 401 });

  const responseUnauthorized = () => {
    const response = NextResponse.json({ code: "BOOKING_NOT_FOUND" }, { status: 401 });
    clearBookingSessionCookie(response);
    return response;
  };

  try {
    const hash = hashBookingRecoverySecret(secret);
    const supabase = createServerSupabaseClient();
    const { data: initialData, error } = await supabase
      .from("appointments")
      .select("id,status,hold_expires_at,email,country_code,phone,consented_at,amount_minor,currency,slot:slots!inner(id,starts_at,ends_at,timezone)")
      .eq("booking_access_token_hash", hash)
      .maybeSingle();

    if (error) throw error;
    if (!initialData) return responseUnauthorized();
    let data = initialData;

    if (data.status === "held" && (!data.hold_expires_at || new Date(data.hold_expires_at).getTime() <= Date.now())) {
      await supabase
        .from("appointments")
        .update({ status: "expired", hold_expires_at: null, booking_access_token_hash: null })
        .eq("id", data.id)
        .eq("booking_access_token_hash", hash)
        .eq("status", "held")
        .lte("hold_expires_at", new Date().toISOString());
      return responseUnauthorized();
    }

    if (data.status === "expired" || data.status === "cancelled") {
      await supabase.from("appointments").update({ booking_access_token_hash: null }).eq("id", data.id);
      return responseUnauthorized();
    }

    const slot = Array.isArray(data.slot) ? data.slot[0] : data.slot;
    if (!slot) throw new Error("Missing booking slot");
    const { data: initialPayment, error: paymentError } = await supabase.from("payments")
      .select("id,status,provider_order_id").eq("appointment_id", data.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (paymentError) throw paymentError;
    let latestPayment = initialPayment;

    if (latestPayment?.status === "approved_provisional" && latestPayment.provider_order_id) {
      try {
        await reconcileMercadoPagoOrder(latestPayment.provider_order_id);
        const [{ data: refreshedBooking, error: refreshedBookingError }, { data: refreshedPayment, error: refreshedPaymentError }] = await Promise.all([
          supabase
            .from("appointments")
            .select("id,status,hold_expires_at,email,country_code,phone,consented_at,amount_minor,currency,slot:slots!inner(id,starts_at,ends_at,timezone)")
            .eq("id", data.id)
            .eq("booking_access_token_hash", hash)
            .maybeSingle(),
          supabase.from("payments")
            .select("id,status,provider_order_id")
            .eq("appointment_id", data.id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (refreshedBookingError || refreshedPaymentError) throw refreshedBookingError ?? refreshedPaymentError;
        if (refreshedBooking) data = refreshedBooking;
        latestPayment = refreshedPayment;
      } catch {
        // Webhook remains the authority of record; recovery can safely retry later.
      }
    }

    return NextResponse.json({
      appointmentId: data.id,
      status: data.status,
      holdExpiresAt: data.hold_expires_at,
      slot: {
        id: slot.id,
        startsAt: slot.starts_at,
        endsAt: slot.ends_at,
        timezone: slot.timezone,
      },
      contact: data.email && data.country_code && data.phone && data.consented_at
        ? {
            email: data.email,
            countryCode: data.country_code,
            phone: data.phone.slice(data.country_code.length),
            consented: true,
          }
        : null,
      amountMinor: data.amount_minor,
      currency: data.currency,
      payment: latestPayment ? {
        id: latestPayment.id,
        status: latestPayment.status === "approved" || latestPayment.status === "approved_provisional" || latestPayment.status === "pending" || latestPayment.status === "rejected"
          ? latestPayment.status : "processing",
      } : null,
    });
  } catch {
    return NextResponse.json({ code: "BOOKING_RECOVERY_UNAVAILABLE" }, { status: 503 });
  }
}
