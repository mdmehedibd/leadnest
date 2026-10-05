import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const CATEGORIES = ["hot", "warm", "cold"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret || request.headers.get("x-callback-secret") !== secret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const leadId = String(body.lead_id ?? "");
  const orgId = String(body.organization_id ?? "");
  const category = String(body.category ?? "").toLowerCase();
  const score = Number(body.score);

  if (
    !UUID_RE.test(leadId) ||
    !UUID_RE.test(orgId) ||
    !CATEGORIES.includes(category) ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 100
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid input" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("leads")
        .update({
      category,
      score,
      next_followup_at:
        category === "hot"
          ? null
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", leadId)
    .eq("organization_id", orgId)
    .select("id");

  if (error) {
    return NextResponse.json(
      { success: false, error: "Update failed" },
      { status: 500 }
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { success: false, error: "Lead not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}