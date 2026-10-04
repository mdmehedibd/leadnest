import { createClient } from "@supabase/supabase-js";

// শুধু server-এ ব্যবহার হবে। এই ফাইল কখনো "use client" ফাইল থেকে import করবে না।
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}