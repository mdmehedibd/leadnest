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
  timeline: string | null;
  location: string | null;
  ai_reasons: string[] | null;
  recommended_action: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  lead_id: string;
  scheduled_at: string;
  type: "call" | "property_visit" | "meeting";
  notes: string | null;
  status: "scheduled" | "done" | "cancelled";
};

type Filter = "all" | "hot" | "warm" | "cold";
type SortKey = "name" | "budget" | "score" | "created_at";
type View = "dashboard" | "leads" | "appointments";

const BADGE: Record<string, string> = {
  hot: "bg-red-500/15 text-red-400 ring-red-500/30",
  warm: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  cold: "bg-sky-500/15 text-sky-400 ring-sky-500/30",
};

const DOT: Record<string, string> = {
  hot: "bg-red-500",
  warm: "bg-amber-500",
  cold: "bg-sky-500",
};

const TYPE_LABEL: Record<string, string> = {
  call: "Call",
  property_visit: "Property visit",
  meeting: "Meeting",
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  visit_scheduled: "Visit scheduled",
  contacted: "Contacted",
  closed: "Closed",
};
const TIMELINE_LABEL: Record<string, string> = {
  asap: "Within 30 days",
  "1_3_months": "1-3 months",
  "3_6_months": "3-6 months",
  "6_plus_months": "6+ months",
  browsing: "Just browsing",
};
function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Working late";
}

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [captureKey, setCaptureKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [now, setNow] = useState<Date>(() => new Date());

  const [name, setName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState("");
  const [leadTimeline, setLeadTimeline] = useState("");
  const [leadLocation, setLeadLocation] = useState("");

  const [apptWhen, setApptWhen] = useState("");
  const [apptType, setApptType] = useState<Appointment["type"]>("property_visit");
  const [apptNotes, setApptNotes] = useState("");
  const [apptSaving, setApptSaving] = useState(false);
  const [apptError, setApptError] = useState("");
  const [conflictWarn, setConflictWarn] = useState("");

  // greeting প্রতি মিনিটে হালনাগাদ
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const loadLeads = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id,name,email,phone,message,budget,status,source,score,category,followup_step,unsubscribed,timeline,location,ai_reasons,recommended_action,created_at"
      )
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      return;
    }
    setLeads(data ?? []);
  }, []);

  const loadAppts = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("appointments")
      .select("id,lead_id,scheduled_at,type,notes,status")
      .order("scheduled_at", { ascending: true });
    if (error) {
      setError(error.message);
      return;
    }
    setAppts((data ?? []) as Appointment[]);
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

      await Promise.all([loadLeads(), loadAppts()]);
      setChecking(false);
    }
    init();
  }, [router, loadLeads, loadAppts]);

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
      timeline: leadTimeline || null,
      location: leadLocation.trim() || null,
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
    setLeadTimeline("");
    setLeadLocation("");
    setShowForm(false);
    await loadLeads();
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  const leadName = useMemo(() => {
    const m = new Map<string, string>();
    leads.forEach((l) => m.set(l.id, l.name));
    return m;
  }, [leads]);

  async function handleAddAppt(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !selectedId) return;
    setApptError("");

    const when = new Date(apptWhen);
    if (!apptWhen || isNaN(when.getTime())) {
      setApptError("Please choose a valid date and time.");
      return;
    }
    if (when.getTime() < Date.now()) {
      setApptError("Please choose a time in the future.");
      return;
    }

    const clash = appts.find(
      (a) =>
        a.status === "scheduled" &&
        Math.abs(new Date(a.scheduled_at).getTime() - when.getTime()) <
          30 * 60 * 1000
    );
    if (clash && !conflictWarn) {
      setConflictWarn(
        `Another appointment with ${
          leadName.get(clash.lead_id) ?? "a lead"
        } is at ${fmt(clash.scheduled_at)}. Press "Schedule anyway" to continue.`
      );
      return;
    }
    setConflictWarn("");

    setApptSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("appointments").insert({
      organization_id: orgId,
      lead_id: selectedId,
      scheduled_at: when.toISOString(),
      type: apptType,
      notes: apptNotes.trim() || null,
    });
    if (error) {
      setApptSaving(false);
      setApptError(error.message);
      return;
    }

    await supabase
      .from("leads")
      .update({ status: "visit_scheduled" })
      .eq("id", selectedId)
      .in("status", ["new", "contacted"]);

    setApptSaving(false);
    setApptWhen("");
    setApptNotes("");
    setApptType("property_visit");
    await Promise.all([loadAppts(), loadLeads()]);
  }

  async function setApptStatus(id: string, status: Appointment["status"]) {
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);
    if (error) {
      setApptError(error.message);
      return;
    }
    await loadAppts();
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

  function openLead(id: string) {
    setSelectedId(id);
    setApptError("");
    setConflictWarn("");
  }

  const selected = useMemo(
    () => leads.find((l) => l.id === selectedId) ?? null,
    [leads, selectedId]
  );

  const nextApptByLead = useMemo(() => {
    const m = new Map<string, string>();
    const t = Date.now();
    appts.forEach((a) => {
      if (a.status !== "scheduled") return;
      if (new Date(a.scheduled_at).getTime() < t) return;
      const cur = m.get(a.lead_id);
      if (!cur || new Date(a.scheduled_at) < new Date(cur)) {
        m.set(a.lead_id, a.scheduled_at);
      }
    });
    return m;
  }, [appts]);

  const upcomingAll = useMemo(
    () =>
      appts.filter(
        (a) =>
          a.status === "scheduled" &&
          new Date(a.scheduled_at).getTime() >= Date.now()
      ),
    [appts]
  );

  const selectedAppts = useMemo(
    () =>
      appts
        .filter((a) => a.lead_id === selectedId)
        .sort(
          (a, b) =>
            new Date(b.scheduled_at).getTime() -
            new Date(a.scheduled_at).getTime()
        ),
    [appts, selectedId]
  );

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

  const stats: { label: string; value: number; dot: string }[] = [
    { label: "Total Leads", value: leads.length, dot: "bg-slate-400" },
    { label: "Hot", value: count("hot"), dot: DOT.hot },
    { label: "Warm", value: count("warm"), dot: DOT.warm },
    { label: "Cold", value: count("cold"), dot: DOT.cold },
    { label: "Upcoming Appointments", value: upcomingAll.length, dot: "bg-green-500" },
  ];

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "hot", label: "Hot" },
    { key: "warm", label: "Warm" },
    { key: "cold", label: "Cold" },
  ];

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const followupText = (l: Lead) => {
    if (l.unsubscribed) return "Unsubscribed";
    if (l.category === "hot") return "Hot lead (agent follows up)";
    if (!l.category) return "Not qualified yet";
    return `${l.followup_step} of 3 follow-up emails sent`;
  };

  const followupShort = (l: Lead) => {
    if (l.unsubscribed) return "Unsubscribed";
    if (!l.category) return "-";
    if (l.category === "hot") return "Agent";
    if (l.followup_step >= 3) return "Done";
    if (l.followup_step === 0) return "Scheduled";
    return `Sent ${l.followup_step}/3`;
  };

  const shortWhen = (iso: string) =>
    new Date(iso).toLocaleString([], {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const userName = email ? email.split("@")[0] : "";
  const todayText = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const navItems: { key: View; label: string; icon: string }[] = [
    { key: "dashboard", label: "Dashboard", icon: "▦" },
    { key: "leads", label: "Leads", icon: "◉" },
    { key: "appointments", label: "Appointments", icon: "▣" },
  ];

  const showLeadTable = view === "dashboard" || view === "leads";
  const leadRows = view === "dashboard" ? visible.slice(0, 8) : visible;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/60 p-4 md:flex">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold">
            L
          </div>
          <span className="text-lg font-semibold">LeadNest</span>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm " +
                (view === n.key
                  ? "bg-blue-600/15 text-blue-300 ring-1 ring-blue-500/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")
              }
            >
              <span className="w-4 text-center">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="truncate px-2 text-xs text-slate-500">{email}</div>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold">
              L
            </div>
            <span className="font-semibold">LeadNest</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
          >
            Log out
          </button>
        </header>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-800 px-4 py-2 md:hidden">
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={
                "shrink-0 rounded-md px-3 py-1.5 text-sm " +
                (view === n.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-400")
              }
            >
              {n.label}
            </button>
          ))}
        </div>

        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
          {/* Greeting */}
          <section className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                {greetingFor(now)}
                {userName ? `, ${userName}` : ""}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Here&apos;s your pipeline today · {todayText}
              </p>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className={field + " max-w-xs"}
            />
          </section>

          {/* Stats */}
          {view !== "appointments" && (
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    {s.label}
                  </div>
                  <div className="mt-2 text-3xl font-bold">{s.value}</div>
                </div>
              ))}
            </section>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Appointments view */}
          {view === "appointments" && (
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="text-sm font-semibold">
                Upcoming appointments ({upcomingAll.length})
              </h2>
              {upcomingAll.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No upcoming appointments. Open a lead to schedule one.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-800">
                  {upcomingAll.map((a) => (
                    <li
                      key={a.id}
                      onClick={() => openLead(a.lead_id)}
                      className="flex cursor-pointer items-center justify-between gap-3 py-3 hover:text-blue-300"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {leadName.get(a.lead_id) ?? "Lead"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {TYPE_LABEL[a.type]}
                          {a.notes ? ` · ${a.notes}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-slate-300">
                        {fmt(a.scheduled_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Capture link (dashboard only) */}
          {view === "dashboard" && captureUrl && (
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
          {showLeadTable && (
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
                <button
                  onClick={() => setShowForm((v) => !v)}
                  className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
                  {showForm ? "Close" : "+ Add lead"}
                </button>
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
                      <select className={field} value={leadTimeline}
                      onChange={(e) => setLeadTimeline(e.target.value)}>
                      <option value="">Timeline (optional)</option>
                      <option value="asap">Within 30 days</option>
                      <option value="1_3_months">1-3 months</option>
                      <option value="3_6_months">3-6 months</option>
                      <option value="6_plus_months">6+ months</option>
                      <option value="browsing">Just browsing</option>
                    </select>
                    <input className={field} placeholder="Location" value={leadLocation}
                      onChange={(e) => setLeadLocation(e.target.value)} />
                  </div>
                  <textarea className={field} rows={3} placeholder="Message" value={message}
                    onChange={(e) => setMessage(e.target.value)} />
                  <button type="submit" disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                    {saving ? "Saving..." : "Save lead"}
                  </button>
                </form>
              )}

              {leadRows.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">
                  {leads.length === 0
                    ? "No leads yet. Share your capture link or add one manually."
                    : "No leads match your search or filter."}
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead className="border-b border-slate-800 text-xs text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          <button onClick={() => toggleSort("name")} className="hover:text-slate-200">
                            Name{arrow("name")}
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Phone</th>
                        <th className="px-4 py-3 font-medium">
                          <button onClick={() => toggleSort("budget")} className="hover:text-slate-200">
                            Budget{arrow("budget")}
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium">Timeline</th>
                        <th className="px-4 py-3 font-medium">
                          <button onClick={() => toggleSort("score")} className="hover:text-slate-200">
                            AI Category{arrow("score")}
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium">Follow-up</th>
                        <th className="px-4 py-3 font-medium">Appointment</th>
                        <th className="px-4 py-3 font-medium">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {leadRows.map((l) => (
                        <tr
                          key={l.id}
                          onClick={() => openLead(l.id)}
                          className="cursor-pointer hover:bg-slate-800/50"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-100">
                            {l.name}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {l.email ?? "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                            {l.phone ?? "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-200">
                            {l.budget !== null
                              ? "$" + Number(l.budget).toLocaleString()
                              : "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                            {l.timeline ? TIMELINE_LABEL[l.timeline] : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {l.category ? (
                              <span
                                className={
                                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold uppercase ring-1 " +
                                  (BADGE[l.category] ?? "")
                                }
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${DOT[l.category] ?? ""}`} />
                                {l.category} {l.score}
                              </span>
                            ) : (
                              <span className="text-xs uppercase text-slate-500">
                                unqualified
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                            {followupShort(l)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-200">
                            {nextApptByLead.has(l.id)
                              ? shortWhen(nextApptByLead.get(l.id)!)
                              : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                            {STATUS_LABEL[l.status] ?? l.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {view === "dashboard" && visible.length > 8 && (
                <button
                  onClick={() => setView("leads")}
                  className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                >
                  View all {visible.length} leads →
                </button>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Lead detail panel */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          onClick={() => setSelectedId(null)}
        >
          <aside
            className="h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-slate-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold">{selected.name}</h2>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-lg border border-slate-700 px-3 py-1 text-sm hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
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
              <span className="text-xs text-slate-400">
                {STATUS_LABEL[selected.status] ?? selected.status}
              </span>
            </div>
            {selected.category && (
              <div
                className={
                  "mt-6 rounded-xl p-4 ring-1 " +
                  (BADGE[selected.category] ?? "")
                }
              >
                <div className="text-xs font-bold uppercase">
                  {selected.category === "hot" ? "🔥 " : ""}
                  {selected.category} lead
                </div>
                <div className="mt-1 text-lg font-bold">
                  Score: {selected.score}/100
                </div>
                {selected.ai_reasons && selected.ai_reasons.length > 0 && (
                  <>
                    <div className="mt-3 text-xs uppercase opacity-80">
                      Reasons
                    </div>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-200">
                      {selected.ai_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </>
                )}
                {selected.recommended_action && (
                  <>
                    <div className="mt-3 text-xs uppercase opacity-80">
                      Recommended action
                    </div>
                    <p className="mt-1 text-sm text-slate-100">
                      {selected.recommended_action}
                    </p>
                  </>
                )}
              </div>
            )}
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
                <dt className="text-xs uppercase text-slate-500">Timeline</dt>
                <dd className="text-slate-200">
                  {selected.timeline ? TIMELINE_LABEL[selected.timeline] : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Location</dt>
                <dd className="text-slate-200">{selected.location ?? "-"}</dd>
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

            <div className="mt-8 border-t border-slate-800 pt-6">
              <h3 className="text-sm font-semibold">Appointments</h3>

              <form onSubmit={handleAddAppt} className="mt-3 space-y-3">
                <input
                  type="datetime-local"
                  value={apptWhen}
                  onChange={(e) => {
                    setApptWhen(e.target.value);
                    setConflictWarn("");
                  }}
                  className={field}
                  required
                />
                <select
                  value={apptType}
                  onChange={(e) =>
                    setApptType(e.target.value as Appointment["type"])
                  }
                  className={field}
                >
                  <option value="property_visit">Property visit</option>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                </select>
                <textarea
                  rows={2}
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className={field}
                />
                {apptError && (
                  <p className="text-sm text-red-400">{apptError}</p>
                )}
                {conflictWarn && (
                  <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-300">
                    {conflictWarn}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={apptSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {apptSaving
                    ? "Saving..."
                    : conflictWarn
                    ? "Schedule anyway"
                    : "Schedule appointment"}
                </button>
              </form>

              {selectedAppts.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No appointments for this lead yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {selectedAppts.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">
                            {TYPE_LABEL[a.type]}
                          </div>
                          <div className="text-xs text-slate-400">
                            {fmt(a.scheduled_at)}
                          </div>
                        </div>
                        <span
                          className={
                            "rounded-full px-2 py-0.5 text-xs uppercase ring-1 " +
                            (a.status === "scheduled"
                              ? "text-blue-300 ring-blue-500/40"
                              : a.status === "done"
                              ? "text-green-400 ring-green-500/40"
                              : "text-slate-500 ring-slate-700")
                          }
                        >
                          {a.status}
                        </span>
                      </div>
                      {a.notes && (
                        <p className="mt-2 text-xs text-slate-300">{a.notes}</p>
                      )}
                      {a.status === "scheduled" && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setApptStatus(a.id, "done")}
                            className="rounded border border-green-500/40 px-2 py-1 text-xs text-green-400 hover:bg-green-500/10"
                          >
                            Mark done
                          </button>
                          <button
                            onClick={() => setApptStatus(a.id, "cancelled")}
                            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}