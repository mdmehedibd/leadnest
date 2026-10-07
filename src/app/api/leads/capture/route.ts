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
  const TIMELINES = ["asap", "1_3_months", "3_6_months", "6_plus_months", "browsing"];
  const timelineRaw = String(body.timeline ?? "");
  const timeline = TIMELINES.includes(timelineRaw) ? timelineRaw : null;
  const location = body.location
    ? String(body.location).trim().slice(0, 100)
    : null;
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
  // Honeypot: bot এই লুকানো ঘর ভরে ফেলে
  if (body.website) {
    return NextResponse.json({ success: true }, { status: 201 });
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
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  // IP limit: ঘণ্টায় সর্বোচ্চ ৫টা
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: ipCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("client_ip", ip)
    .gte("created_at", hourAgo);
  if ((ipCount ?? 0) >= 5) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  // Duplicate: একই org-এ একই email ১০ মিনিটে নয়
  if (email) {
    const tenAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: dupCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("email", email)
      .gte("created_at", tenAgo);
    if ((dupCount ?? 0) > 0) {
      return NextResponse.json({ success: true }, { status: 201 });
    }
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
      timeline,
      location,
      client_ip: ip,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: "Could not save lead" },
      { status: 500 }
    );
  }
  // n8n-কে জানাও। এটা fail করলেও lead save থেকে যাবে।
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (webhookUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
        },
        body: JSON.stringify({
          lead_id: lead.id,
          organization_id: org.id,
          name,
          email,
          phone,
          message,
          budget,
          timeline,
          location,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      console.error("n8n webhook failed:", err);
    } finally {
      clearTimeout(timer);
    }
  }
  return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
}