import { createAdminClient } from "@/lib/supabase-admin";
import { verifyToken } from "@/lib/unsubscribe-token";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; token?: string }>;
}) {
  const { lead = "", token = "" } = await searchParams;

  let message = "This unsubscribe link is invalid.";

  if (UUID_RE.test(lead) && token && verifyToken(lead, token)) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("leads")
      .update({ unsubscribed: true, next_followup_at: null })
      .eq("id", lead);
    message = error
      ? "Something went wrong. Please try again later."
      : "You have been unsubscribed. You will not receive further emails.";
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p className="max-w-sm text-center text-lg">{message}</p>
    </main>
  );
}