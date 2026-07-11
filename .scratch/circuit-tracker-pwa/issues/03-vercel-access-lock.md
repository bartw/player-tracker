# Verify the Vercel access lock

Type: research
Status: resolved

## Question

Can Vercel's platform protection lock the production deployment on the coach's plan — and if not, which fallback do we take?

To resolve (via /research against vercel.com/docs, plus checking the actual account plan — that part may need the coach, making this partly HITL):

- What Deployment Protection options (Vercel Authentication, Password Protection, Trusted IPs) are available on the Hobby vs Pro plan for **production** (not just previews)?
- Does the protection cover API routes (the Notion proxy) as well as pages?
- Does a protected deployment still work as an installed PWA (service worker + auth interplay)?
- If platform protection isn't available/workable: confirm the fallback — a simple shared-secret check in the proxy — and note what it needs (cookie vs header, where the secret lives).

Decision on record: platform auth preferred, shared secret is the agreed fallback (see map Notes).

## Answer

Resolved 2026-07-11. Full findings with citations: [vercel-access-lock-research.md](../assets/vercel-access-lock-research.md). The coach confirmed the account is on the **Hobby plan**.

**Decision: take the shared-secret fallback.** Vercel's built-in protection cannot lock this app's production URL:

- On Hobby, Vercel Authentication covers only preview/deployment URLs — the docs state outright that the production domain remains publicly accessible.
- Even on Pro, protecting production requires the Advanced Deployment Protection add-on (~$150/month); Trusted IPs is Enterprise-only. Not worth it for a personal tool on any plan.
- PWA behavior behind Vercel's protection is officially undocumented and looks hostile (auth cookies + 401s on manifest/service-worker fetches), so platform protection would have been risky even if free.

**The lock that ships instead:**

- App shell, manifest, and service worker stay **public** (they contain nothing sensitive) so the PWA installs cleanly.
- Everything under `/api/*` requires a long-lived **HttpOnly cookie** carrying the shared secret, checked in Routing Middleware plus redundantly in the proxy handler; a simple PIN-entry screen sets the cookie once per device.
- The Notion token lives only in Vercel env vars, server-side.
- Hobby limits (~1M function invocations/month) are orders of magnitude beyond this app's needs.
