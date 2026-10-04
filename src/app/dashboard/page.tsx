"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  budget: number | null;
  status: string;
  score: number | null;
  category: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState("");

  const loadLeads = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("leads")
        .select("id,name,email,phone,message,budget,status,score,category,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      return;
    }
    setLeads(data ?? []);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);

      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", data.user.id)
        .single();
      if (pErr || !profile) {
        setError("Profile not found: " + (pErr?.message ?? ""));
        setChecking(false);
        return;
      }
      setOrgId(profile.organization_id);
      await loadLeads();
      setChecking(false);
    }
    init();
  }, [router, loadLeads]);

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setError("");
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("leads").insert({
      organization_id: orgId,
      name,
      email: leadEmail || null,
      phone: phone || null,
      message: message || null,
      budget: budget ? Number(budget) : null,
      source: "manual",
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setLeadEmail("");
    setPhone("");
    setMessage("");
    setBudget("");
    await loadLeads();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checking) {
    return <main className="p-10">Loading...</main>;
  }

  const input =
    "w-full rounded border bg-white p-2 text-black placeholder:text-gray-500";

  return (
    <main className="mx-auto max-w-3xl p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm opacity-70">Logged in as: {email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          Log out
        </button>
      </div>

      <form onSubmit={handleAddLead} className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Add lead</h2>
        <input className={input} placeholder="Name *" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <input className={input} type="email" placeholder="Email" value={leadEmail}
          onChange={(e) => setLeadEmail(e.target.value)} />
        <input className={input} placeholder="Phone" value={phone}
          onChange={(e) => setPhone(e.target.value)} />
        <input className={input} type="number" placeholder="Budget (USD)" value={budget}
          onChange={(e) => setBudget(e.target.value)} />
        <textarea className={input} placeholder="Message" value={message}
          onChange={(e) => setMessage(e.target.value)} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={saving}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {saving ? "Saving..." : "Add lead"}
        </button>
      </form>

      <h2 className="mt-10 text-xl font-semibold">Leads ({leads.length})</h2>
      {leads.length === 0 ? (
        <p className="mt-2 opacity-70">No leads yet. Add your first one above.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {leads.map((l) => (
            <li key={l.id} className="rounded border border-gray-600 p-3">
              <div className="flex justify-between">
                <span className="font-semibold">{l.name}</span>
                                <span className="text-xs uppercase">
                  {l.category ? (
                    <b
                      className={
                        l.category === "hot"
                          ? "text-red-500"
                          : l.category === "warm"
                          ? "text-yellow-500"
                          : "text-blue-400"
                      }
                    >
                      {l.category} {l.score}
                    </b>
                  ) : (
                    <span className="opacity-70">unqualified</span>
                  )}
                </span>
              </div>
              <div className="text-sm opacity-80">
                {[l.email, l.phone].filter(Boolean).join(" · ")}
              </div>
              {l.budget !== null && (
                <div className="text-sm">Budget: ${l.budget}</div>
              )}
              {l.message && <div className="mt-1 text-sm">{l.message}</div>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}