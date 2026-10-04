"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);
      setChecking(false);
    });
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checking) {
    return <main className="p-10">Loading...</main>;
  }

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-4">Logged in as: {email}</p>
      <button
        onClick={handleLogout}
        className="mt-6 rounded bg-red-600 px-4 py-2 text-white"
      >
        Log out
      </button>
    </main>
  );
}