# LeadNest

AI-powered lead capture, qualification and follow-up automation for real estate agents.

**Live demo:** https://leadnest-sigma.vercel.app

A visitor fills in a form, and within seconds the lead is scored by AI as HOT, WARM or COLD. The agent gets a Telegram alert for hot leads, and the lead receives a welcome email followed by an automatic follow-up sequence.

## The problem

Real estate agents get leads from ads, websites and referrals, but:

- leads end up scattered in different places
- it is hard to tell serious buyers from casual browsers
- follow-ups get forgotten, and deals are lost
- replying slowly (speed-to-lead) makes leads go cold

## How it works

```text
Visitor
  |  fills the public form  (/capture/<capture_key>)
  v
Next.js API route  (validates input, rate limit, honeypot, duplicate check)
  |
  v
Supabase Postgres  (multi-tenant, Row Level Security)
  |
  v
n8n webhook  ->  Gemini AI (structured JSON: category, score, reason)
  |
  v
Callback API  ->  saves category + score, schedules follow-ups
  |
  +--> HOT lead: Telegram alert to the agent
  +--> Lead has email: welcome email (Gmail)
  +--> WARM / COLD: follow-up emails on Day 1, 3 and 7 (hourly scheduler)
  v
Agent dashboard (HOT / WARM / COLD badges)
```

## Features

- Email signup with confirmation, login, logout
- **Multi-tenant**: each agency only sees its own leads (Postgres Row Level Security)
- Public lead form with a unique link per agency, shown on the dashboard
- AI lead qualification with strict structured output (category, score, reason)
- Telegram alert for HOT leads
- Welcome email and Day 1 / 3 / 7 follow-up sequence for WARM and COLD leads
- Signed (HMAC) one-click unsubscribe link
- Spam protection: honeypot field, per-IP limit (5 per hour), duplicate email check
- Server-side route protection for `/dashboard`

## Tech stack

| Layer | Tool |
|---|---|
| Frontend / API | Next.js 16 (App Router, TypeScript, Tailwind CSS) |
| Database + Auth | Supabase (Postgres, Row Level Security) |
| Automation | n8n (self-hosted on a VPS) |
| AI | Google Gemini via n8n AI Agent + Structured Output Parser |
| Email | Gmail (demo) |
| Alerts | Telegram Bot |
| Hosting | Vercel |

## Security notes

- Row Level Security on `organizations`, `profiles` and `leads`
- The Supabase `service_role` key is used only in server-side routes
- n8n never holds the admin key; it calls the app through secret-protected callback routes
- Webhook and callback routes are protected with shared secrets in headers
- Unsubscribe links are signed with HMAC and verified with a timing-safe comparison
- No secrets are committed; see `.env.example`

## Local setup

Requirements: Node.js 20+, a Supabase project, and an n8n instance.

```bash
git clone https://github.com/mdmehedibd/leadnest.git
cd leadnest
npm install
```

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=
N8N_CALLBACK_SECRET=
UNSUBSCRIBE_SECRET=
```

| Variable | Public? | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | safe because of RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | server only, never expose |
| `N8N_WEBHOOK_URL` | secret | n8n production webhook URL |
| `N8N_WEBHOOK_SECRET` | secret | header secret for the n8n webhook |
| `N8N_CALLBACK_SECRET` | secret | n8n calls the app with this header |
| `UNSUBSCRIBE_SECRET` | secret | signs unsubscribe links |

```bash
npm run dev
```

Open http://localhost:3000.

## API routes

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/leads/capture` | POST | Public form submission | `capture_key` in body |
| `/api/leads/qualified` | POST | n8n saves AI result | `x-callback-secret` |
| `/api/followups/due` | GET | n8n fetches leads due for follow-up | `x-callback-secret` |
| `/api/followups/done` | POST | n8n marks a follow-up as sent | `x-callback-secret` |

## Known limitations

This is an MVP. Honest list of what it does not do yet:

- Emails are sent through a personal Gmail account (demo only); production needs a transactional provider such as Resend with a verified domain
- Hot-lead alerts go to a single Telegram chat; per-agency notification settings are not built yet
- The welcome email still uses "reply to unsubscribe"; only follow-up emails have the signed link
- No billing, team invites, WhatsApp/SMS, or CSV import
- Supabase free tier pauses inactive projects, so it is fine for a demo but not for paying customers

## Roadmap

- Per-agency notification settings
- Resend + custom domain for email
- Facebook Lead Ads integration
- WhatsApp outreach (UAE market)
- Billing (Stripe) and team members
- Lead status pipeline (New, Contacted, Visit, Closed)

## Author

Built by MD Mehedi Hasan as a full-stack SaaS learning project combining Next.js, Supabase, n8n and AI.