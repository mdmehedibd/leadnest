"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  source: string | null;
  score: number | null;
  category: string | null;
  followup_step: number;
  unsubscribed: boolean;
  created_at: string;
};

type Filter = "all" | "hot" | "warm" | "cold";
type SortKey = "name" | "budget" | "score" | "created_at";

const BADGE: Record<string, string> = {
  hot: "bg-red-500/15 text-red-400 ring-red-500/30",
  warm: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  cold: "bg-sky-500/15 text-sky-400 ring-sky-500/30",
};

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [captureKey, setCaptureKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Lead | null>(null);

  const [name, setName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState("");

  const loadLeads = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id,name,email,phone,message,budget,status,source,score,category,followup_step,unsubscribed,created_at"
      )
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

      const { data: org } = await supabase
        .from("organizations")
        .select("capture_key")
        .eq("id", profile.organization_id)
        .single();
      if (org) setCaptureKey(org.capture_key);

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
    setShowForm(false);
    await loadLeads();
  }

  const captureUrl = captureKey
    ? `${window.location.origin}/capture/${captureKey}`
    : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(captureUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Select the link and copy manually.");
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = leads.filter((l) => {
      if (filter !== "all" && l.category !== filter) return false;
      if (!q) return true;
      return [l.name, l.email, l.phone, l.message]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "created_at") {
        return (
          (new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()) *
          dir
        );
      }
      // budget / score: খালি মান সবসময় শেষে
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return (Number(av) - Number(bv)) * dir;
    });
  }, [leads, filter, search, sortKey, sortDir]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading...
      </main>
    );
  }

  const count = (c: string) => leads.filter((l) => l.category === c).length;

  const field =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none";

  const stats = [
    { label: "Total", value: leads.length, color: "text-slate-100" },
    { label: "Hot", value: count("hot"), color: "text-red-400" },
    { label: "Warm", value: count("warm"), color: "text-amber-400" },
    { label: "Cold", value: count("cold"), color: "text-sky-400" },
  ];

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "hot", label: "Hot" },
    { key: "warm", label: "Warm" },
    { key: "cold", label: "Cold" },
  ];

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "budget", label: "Budget" },
    { key: "score", label: "Status" },
    { key: "created_at", label: "Date" },
  ];

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const followupText = (l: Lead) => {
    if (l.unsubscribed) return "Unsubscribed";
    if (l.category === "hot") return "Hot lead (agent follows up)";
    if (!l.category) return "Not qualified yet";
    return `${l.followup_step} of 3 follow-up emails sent`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold">
              L
            </div>
            <span className="text-lg font-semibold">LeadNest</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">
              {email}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Stat cards */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="text-xs uppercase tracking-wide text-slate-400">
                {s.label}
              </div>
              <div className={`mt-1 text-3xl font-bold ${s.color}`}>
                {s.value}
              </div>
            </div>
          ))}
        </section>

        {/* Capture link */}
        {captureUrl && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold">Your capture link</h2>
            <p className="mt-1 text-xs text-slate-400">
              Share this link or embed it on your website or ads. Leads go
              straight to this dashboard.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={captureUrl}
                onFocus={(e) => e.currentTarget.select()}
                className={field + " text-xs"}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </section>
        )}

        {/* Leads */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={
                    "rounded-md px-3 py-1.5 text-sm " +
                    (filter === t.key
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-slate-200")
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-1 items-center justify-end gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone, message..."
                className={field + " max-w-xs"}
              />
              <button
                onClick={() => setShowForm((v) => !v)}
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                {showForm ? "Close" : "+ Add lead"}
              </button>
            </div>
          </div>

          {showForm && (
            <form
              onSubmit={handleAddLead}
              className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={field} placeholder="Name *" value={name}
                  onChange={(e) => setName(e.target.value)} required />
                <input className={field} type="email" placeholder="Email" value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)} />
                <input className={field} placeholder="Phone" value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
                <input className={field} type="number" placeholder="Budget (USD)" value={budget}
                  onChange={(e) => setBudget(e.target.value)} />
              </div>
              <textarea className={field} rows={3} placeholder="Message" value={message}
                onChange={(e) => setMessage(e.target.value)} />
              <button type="submit" disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                {saving ? "Saving..." : "Save lead"}
              </button>
            </form>
          )}

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          {visible.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">
              {leads.length === 0
                ? "No leads yet. Share your capture link or add one manually."
                : "No leads match your search or filter."}
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    {columns.slice(0, 1).map((c) => (
                      <th key={c.key} className="px-4 py-3 font-medium">
                        <button onClick={() => toggleSort(c.key)} className="uppercase hover:text-slate-200">
                          {c.label}{arrow(c.key)}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium">Contact</th>
                    {columns.slice(1).map((c) => (
                      <th key={c.key} className="px-4 py-3 font-medium">
                        <button onClick={() => toggleSort(c.key)} className="uppercase hover:text-slate-200">
                          {c.label}{arrow(c.key)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {visible.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setSelected(l)}
                      className="cursor-pointer hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {l.name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <div>{l.email ?? "-"}</div>
                        <div className="text-xs text-slate-500">
                          {l.phone ?? ""}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {l.budget !== null
                          ? "$" + Number(l.budget).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {l.category ? (
                          <span
                            className={
                              "whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 " +
                              (BADGE[l.category] ?? "")
                            }
                          >
                            {l.category} {l.score}
                          </span>
                        ) : (
                          <span className="text-xs uppercase text-slate-500">
                            unqualified
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Lead detail panel */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          onClick={() => setSelected(null)}
        >
          <aside
            className="h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-slate-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold">{selected.name}</h2>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-slate-700 px-3 py-1 text-sm hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="mt-3">
              {selected.category ? (
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 " +
                    (BADGE[selected.category] ?? "")
                  }
                >
                  {selected.category} {selected.score}
                </span>
              ) : (
                <span className="text-xs uppercase text-slate-500">
                  unqualified
                </span>
              )}
            </div>

            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-xs uppercase text-slate-500">Email</dt>
                <dd className="text-slate-200">{selected.email ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Phone</dt>
                <dd className="text-slate-200">{selected.phone ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Budget</dt>
                <dd className="text-slate-200">
                  {selected.budget !== null
                    ? "$" + Number(selected.budget).toLocaleString()
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Message</dt>
                <dd className="whitespace-pre-wrap text-slate-200">
                  {selected.message ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Source</dt>
                <dd className="text-slate-200">{selected.source ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Follow-up</dt>
                <dd className="text-slate-200">{followupText(selected)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Created</dt>
                <dd className="text-slate-200">
                  {new Date(selected.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}