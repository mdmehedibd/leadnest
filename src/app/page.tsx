import type { Metadata } from "next";
import Link from "next/link";
import { Instrument_Sans } from "next/font/google";

const font = Instrument_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "LeadNest | Lead follow-up for real estate agents",
  description:
    "LeadNest captures property leads, scores them with AI, alerts you when a buyer is serious, and follows up automatically.",
};

// TODO: replace before deploying
const SIGNUP_HREF = "/signup";
const DEMO_HREF =
  "mailto:computerusebd@gmail.com?subject=LeadNest%20demo%20request";

const btnBase =
  "inline-flex items-center justify-center rounded-lg px-5 py-3 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6b5c]";
const btnPrimary = `${btnBase} bg-[#0b6b5c] text-white hover:bg-[#095a4d]`;
const btnSecondary = `${btnBase} border border-[#cfd8e3] bg-white text-[#0f1b2d] hover:bg-[#f1f5f9]`;

const steps = [
  {
    title: "A buyer fills in your form",
    text: "Each agency gets its own public lead form link. Spam is filtered out before it reaches you.",
  },
  {
    title: "AI scores the lead",
    text: "Every lead is marked HOT, WARM or COLD, with a one-line reason so you know why.",
  },
  {
    title: "You act, or LeadNest follows up",
    text: "HOT leads trigger a Telegram alert. Warm and cold leads get a welcome email and follow-ups on days 1, 3 and 7.",
  },
];

const features = [
  {
    title: "Capture",
    text: "A public lead form with a unique link per agency. Honeypot field, per-IP limits and duplicate-email checks keep junk out.",
  },
  {
    title: "Qualify",
    text: "AI sorts leads into HOT, WARM and COLD with a short explanation. HOT leads send you a Telegram alert.",
  },
  {
    title: "Follow up",
    text: "A welcome email, then automatic follow-ups on days 1, 3 and 7. Every email carries a one-click unsubscribe link.",
  },
  {
    title: "Book and remind",
    text: "Schedule calls, property visits and meetings from the dashboard. Reminders arrive on Telegram the evening before and one hour before.",
  },
  {
    title: "Keep data separate",
    text: "Each agency sees only its own leads, enforced in the database with Row Level Security.",
  },
];

function SampleLead() {
  return (
    <div
      className="w-full max-w-md rounded-2xl border border-[#e3e8ef] bg-white p-5 shadow-[0_20px_50px_-24px_rgba(15,27,45,0.35)]"
      aria-label="Sample lead, for illustration"
    >
      <p className="text-xs font-medium text-[#6b7a90]">
        Sample lead (illustration)
      </p>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#0f1b2d]">Sara Ahmed</p>
          <p className="text-sm text-[#52607a]">
            2-bed apartment, budget ready, wants a viewing this week
          </p>
        </div>
        <span className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
          HOT
        </span>
      </div>

      <p className="mt-3 rounded-lg bg-[#f4f7fa] p-3 text-sm text-[#344256]">
        Reason: clear budget, specific property type, and a request for a
        viewing within days.
      </p>

      <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#e8f3f1] p-3">
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#0b6b5c]" />
        <p className="text-sm text-[#0f1b2d]">
          <span className="font-semibold">Telegram alert sent.</span> HOT lead:
          Sara Ahmed wants a viewing this week.
        </p>
      </div>

      <div className="mt-4 flex gap-2 text-xs font-semibold">
        <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-700">
          WARM
        </span>
        <span className="rounded-md bg-sky-50 px-2.5 py-1 text-sky-700">
          COLD
        </span>
        <span className="py-1 font-normal text-[#6b7a90]">
          get an email sequence instead
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div
      className={`${font.className} min-h-screen bg-[#fafbfc] text-[#0f1b2d]`}
    >
      <header className="border-b border-[#e3e8ef] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="text-lg font-bold tracking-tight">LeadNest</span>
          <nav className="flex items-center gap-5 text-sm font-medium text-[#52607a]">
            <a href="#how" className="hidden hover:text-[#0f1b2d] sm:inline">
              How it works
            </a>
            <a
              href="#features"
              className="hidden hover:text-[#0f1b2d] sm:inline"
            >
              Features
            </a>
            <Link href={SIGNUP_HREF} className="hover:text-[#0f1b2d]">
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
              Reply to every property lead while it is still warm
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#52607a]">
              LeadNest captures leads from your website, scores each one with
              AI, alerts you when a buyer is serious, and follows up
              automatically with the rest.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={SIGNUP_HREF} className={btnPrimary}>
                Get started
              </Link>
              <a href={DEMO_HREF} className={btnSecondary}>
                Book a demo
              </a>
            </div>
            <p className="mt-4 text-sm text-[#6b7a90]">
              Built for real estate agents and small agencies.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <SampleLead />
          </div>
        </section>

        <section
          id="how"
          className="border-y border-[#e3e8ef] bg-white py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              How it works
            </h2>
            <p className="mt-3 max-w-2xl text-[#52607a]">
              Agents lose leads because they are scattered, hard to tell apart,
              and answered too late. LeadNest handles the first reply and tells
              you which leads deserve your time.
            </p>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="border-t-2 border-[#0b6b5c] pt-4">
                  <p className="text-sm font-semibold text-[#0b6b5c]">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-[#52607a]">
                    {s.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            What is included
          </h2>
          <dl className="mt-8 border-b border-[#e3e8ef]">
            {features.map((f) => (
              <div
                key={f.title}
                className="grid gap-1 border-t border-[#e3e8ef] py-5 md:grid-cols-[220px_1fr] md:gap-8"
              >
                <dt className="font-semibold">{f.title}</dt>
                <dd className="max-w-2xl leading-relaxed text-[#52607a]">
                  {f.text}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-[#e3e8ef] bg-white py-12">
          <div className="mx-auto max-w-6xl px-5">
            <p className="max-w-3xl text-[#52607a]">
              <span className="font-semibold text-[#0f1b2d]">
                Early access.
              </span>{" "}
              LeadNest is an MVP. Emails currently send from a demo account, so
              use it to see how the workflow runs rather than for live client
              leads.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <div className="rounded-2xl bg-[#0f1b2d] px-6 py-12 text-center md:px-12">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              See it work on a lead form of your own
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[#b8c4d6]">
              Create an account, share your form link, and watch a test lead get
              scored and followed up.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={SIGNUP_HREF}
                className={`${btnBase} bg-white text-[#0f1b2d] hover:bg-[#e8eef5]`}
              >
                Get started
              </Link>
              <a
                href={DEMO_HREF}
                className={`${btnBase} border border-[#4a5b75] text-white hover:bg-[#1a2a42]`}
              >
                Book a demo
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e3e8ef] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-[#6b7a90]">
          <p>LeadNest. Built by MD Mehedi Hasan.</p>
          <p className="flex gap-5">
            <a
              href="https://github.com/mdmehedibd/leadnest"
              className="hover:text-[#0f1b2d]"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/mdmehedibd/"
              className="hover:text-[#0f1b2d]"
            >
              LinkedIn
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}