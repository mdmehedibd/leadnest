import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const captureKey = String(body.capture_key ?? "").trim();
  const name = String(body.name ?? "").trim();
  const email = body.email ? String(body.email).trim() : null;
  const phone = body.phone ? String(body.phone).trim() : null;
  const message = body.message ? String(body.message).trim() : null;
  const budget =
    body.budget !== undefined && body.budget !== "" && !isNaN(Number(body.budget))
      ? Number(body.budget)
      : null;

  if (!captureKey || !name) {
    return NextResponse.json(
      { success: false, error: "capture_key and name are required" },
      { status: 400 }
    );
  }
  if (name.length > 200 || (message && message.length > 5000)) {
    return NextResponse.json(
      { success: false, error: "Input too long" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("capture_key", captureKey)
    .single();

  if (!org) {
    return NextResponse.json(
      { success: false, error: "Invalid capture_key" },
      { status: 401 }
    );
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organization_id: org.id,
      name,
      email,
      phone,
      message,
      budget,
      source: "website",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: "Could not save lead" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
}