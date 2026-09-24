import { NextRequest, NextResponse } from "next/server";
import { processEmailOutbox } from "@/lib/email/outbox";
import { processCalendarOutbox } from "@/lib/google/calendar-outbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const calendar = await processCalendarOutbox(10).catch(() => ({ created: 0, failed: 1 }));
    const email = await processEmailOutbox(10);
    return NextResponse.json({ calendar, email });
  } catch {
    return NextResponse.json({ code: "EMAIL_WORKER_UNAVAILABLE" }, { status: 503 });
  }
}
