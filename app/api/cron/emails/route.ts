import { NextRequest, NextResponse } from "next/server";
import { processEmailOutbox } from "@/lib/email/outbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    return NextResponse.json(await processEmailOutbox(10));
  } catch {
    return NextResponse.json({ code: "EMAIL_WORKER_UNAVAILABLE" }, { status: 503 });
  }
}
