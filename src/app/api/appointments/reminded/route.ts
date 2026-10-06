import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret || request.headers.get("x-callback-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const kind = String(body.kind ?? "");
  if (!UUID_RE.test(id) || !["day", "hour"].includes(kind)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const column = kind === "day" ? "reminder_day_sent" : "reminder_hour_sent";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ [column]: true })
    .eq("id", id)
    .eq(column, false)
    .select("id");

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Already processed" }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}