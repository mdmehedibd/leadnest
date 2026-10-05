import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAYS_UNTIL_NEXT: Record<number, number | null> = { 1: 2, 2: 4, 3: null };

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

  const leadId = String(body.lead_id ?? "");
  const sentStep = Number(body.step_sent);
  if (!UUID_RE.test(leadId) || ![1, 2, 3].includes(sentStep)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const days = DAYS_UNTIL_NEXT[sentStep];
  const next =
    days === null
      ? null
      : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ followup_step: sentStep, next_followup_at: next })
    .eq("id", leadId)
    .eq("followup_step", sentStep - 1) // duplicate এড়াতে
    .select("id");

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Already processed" }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}