import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { EVENT_TYPES, type EventType } from "@/lib/constants";
import { db } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";

/** Analitik olay alıcısı — sendBeacon hedefi. */
export async function POST(req: Request) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!rateLimit(`event:${ip}`, { capacity: 60, refillPerMinute: 60 })) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { type?: string; payload?: unknown; sessionId?: string; path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!EVENT_TYPES.includes(body.type as EventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = JSON.stringify(body.payload ?? {}).slice(0, 2000);
  await db.analyticsEvent.create({
    data: {
      type: body.type!,
      payload,
      sessionId: String(body.sessionId ?? "").slice(0, 64) || null,
      path: String(body.path ?? "").slice(0, 300) || null,
    },
  });

  return NextResponse.json({ ok: true });
}
