"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function Home() {
  const [status, setStatus] = useState("Checking...");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ error }) => {
      setStatus(error ? "❌ Error: " + error.message : "✅ Supabase connected");
    });
  }, []);

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">LeadNest</h1>
      <p className="mt-4">{status}</p>
      <a href="/signup" className="mt-4 inline-block text-blue-500 underline">
        Go to Signup
      </a>
    </main>
  );
}