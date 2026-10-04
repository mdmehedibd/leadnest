"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function CapturePage() {
  const params = useParams<{ key: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capture_key: params.key,
          name,
          email,
          phone,
          budget,
          message,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Something went wrong");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  const input =
    "w-full rounded border bg-white p-2 text-black placeholder:text-gray-500";

  if (status === "done") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-bold">Thank you!</h1>
          <p className="mt-2">We received your details and will contact you soon.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-bold">Find your dream property</h1>
        <p className="text-sm opacity-70">Tell us what you are looking for.</p>

        <input className={input} placeholder="Your name *" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <input className={input} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <input className={input} placeholder="Phone" value={phone}
          onChange={(e) => setPhone(e.target.value)} />
        <input className={input} type="number" placeholder="Budget (USD)" value={budget}
          onChange={(e) => setBudget(e.target.value)} />
        <textarea className={input} placeholder="What are you looking for?" value={message}
          onChange={(e) => setMessage(e.target.value)} />

        {status === "error" && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={status === "sending"}
          className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50">
          {status === "sending" ? "Sending..." : "Submit"}
        </button>
      </form>
    </main>
  );
}