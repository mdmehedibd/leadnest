import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret || request.headers.get("x-callback-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id,organization_id,name,email,category,followup_step")
    .not("email", "is", null)
    .eq("unsubscribed", false)
    .in("category", ["warm", "cold"])
    .lt("followup_step", 3)
    .not("next_followup_at", "is", null)
    .lte("next_followup_at", new Date().toISOString())
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
  return NextResponse.json({ leads: data ?? [] });
}