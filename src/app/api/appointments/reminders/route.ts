import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const TZ = process.env.REMINDER_TIMEZONE || "UTC";

function localDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
}
function localHour(d: Date): number {
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: TZ,
    }).format(d)
  );
  return h % 24;
}
function fmt(d: Date): string {
  return d.toLocaleString("en-US", {
    timeZone: TZ,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type Row = {
  id: string;
  scheduled_at: string;
  type: string;
  notes: string | null;
  reminder_day_sent: boolean;
  reminder_hour_sent: boolean;
  leads: { name: string; phone: string | null; email: string | null } | null;
};

const TYPE_LABEL: Record<string, string> = {
  call: "Call",
  property_visit: "Property visit",
  meeting: "Meeting",
};

export async function GET(request: Request) {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret || request.headers.get("x-callback-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id,scheduled_at,type,notes,reminder_day_sent,reminder_hour_sent,leads(name,phone,email)"
    )
    .eq("status", "scheduled")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", in48h.toISOString())
    .or("reminder_day_sent.eq.false,reminder_hour_sent.eq.false")
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const tomorrow = localDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const isEvening = localHour(now) >= 18;

  const reminders: { id: string; kind: "day" | "hour"; text: string }[] = [];

  for (const r of (data ?? []) as unknown as Row[]) {
    const when = new Date(r.scheduled_at);
    const lead = r.leads;
    const detail =
      `${TYPE_LABEL[r.type] ?? r.type} with ${lead?.name ?? "lead"}\n` +
      `When: ${fmt(when)}\n` +
      (lead?.phone ? `Phone: ${lead.phone}\n` : "") +
      (lead?.email ? `Email: ${lead.email}\n` : "") +
      (r.notes ? `Notes: ${r.notes}` : "");

    const minutesLeft = (when.getTime() - now.getTime()) / 60000;

    if (!r.reminder_hour_sent && minutesLeft <= 60) {
      reminders.push({ id: r.id, kind: "hour", text: `⏰ In 1 hour\n${detail}` });
    } else if (
      !r.reminder_day_sent &&
      isEvening &&
      localDate(when) === tomorrow
    ) {
      reminders.push({ id: r.id, kind: "day", text: `📅 Tomorrow\n${detail}` });
    }
  }

  return NextResponse.json({ reminders });
}