# Vercel Deployment Protection — can it lock the production URL on Hobby?

Research date: 2026-07-11. Primary sources only: vercel.com/docs, vercel.com/kb (official knowledge base), vercel.com/changelog. Community-forum threads are cited only where explicitly flagged as **secondary/unconfirmed**.

## TL;DR

1. **Plans:** Vercel Authentication exists on all plans, but on Hobby it can only protect previews/deployment URLs — **the production domain cannot be protected on Hobby at all**. Production protection ("All Deployments") needs Pro, and Password Protection / private production is a **$150/month Pro add-on** (or Enterprise). Trusted IPs is Enterprise-only.
2. **API coverage / blocked response:** Protection, where active, covers every request (pages, assets, API routes, even middleware). Browser navigations get a login redirect; non-navigation fetches (assets, API calls) get **401 Unauthorized**. Moot for us on Hobby production, though.
3. **PWA interplay:** The official docs are **silent** on service workers, manifests, and installed PWAs. Mechanics (per-URL cookie, 401 on cookie-less fetches) strongly suggest friction; community reports agree but are secondary. Unconfirmed either way.
4. **Vercel Authentication authorized visitors:** team/project members with at least Viewer role, plus at most **one** externally granted Vercel user on Hobby. Phone flow = redirect to Vercel login in the browser, cookie scoped to that single URL.
5. **Fallback (recommended):** built-in protection is out for this project → shared-secret check in **Routing Middleware** over `/api/*`, secret delivered as a long-lived HttpOnly cookie via a tiny login route; keep the app shell, manifest, and service worker public so the PWA installs normally.
6. **Hobby limits:** ~1M function invocations and ~1M edge requests per month, 4 active-CPU-hours, 100 deployments/day. A single-user tracker is 3–4 orders of magnitude below all of them.

**Bottom line for the ticket:** platform protection cannot lock the production domain on the Hobby plan (and even on Pro, private production sits behind a $150/mo add-on). Take the agreed fallback: shared secret, cookie-based, checked in middleware.

---

## 1. Which options exist, and what does each plan get for *production*?

Deployment Protection is configured per project as a **method** (how) plus a **scope** (which URLs). Source: https://vercel.com/docs/deployment-protection

Methods and plan gating (all from https://vercel.com/docs/deployment-protection):

| Method | Plan availability |
|---|---|
| Vercel Authentication | All plans (Hobby, Pro, Enterprise) |
| Password Protection | Enterprise, or **paid add-on for Pro** ($150/month, part of "Advanced Deployment Protection") |
| Trusted IPs | Enterprise only |
| Passport (bring-your-own IdP) | Enterprise only, beta |

Scopes and plan gating (same page):

| Scope | What it protects | Plans |
|---|---|---|
| Standard Protection | All deployments **except production domains** | All plans |
| All Deployments | Everything **including the production domain** | Pro and Enterprise |
| Only Production (via Trusted IPs) | Production only | Enterprise only |

The docs carry an explicit warning that settles the Hobby question:

> "On the Hobby plan, Vercel Authentication with Standard Protection is available. This protects your preview deployments and deployment URLs, but your production domain remains publicly accessible. To protect production domains, you need a Pro or Enterprise plan." — https://vercel.com/docs/deployment-protection

And on Pro, the "Advanced Deployment Protection" section lists **Password Protection, Private Production Deployments, and Deployment Protection Exceptions** as features that "Pro plan customers can access … for an additional $150 per month" (https://vercel.com/docs/deployment-protection#advanced-deployment-protection). Note "Private Production Deployments" links to the All Deployments scope — so even on base Pro, fully locking production appears to sit behind the add-on. The Hobby-plan comparison table confirms Hobby's Deployment Protection column contains only "Vercel Authentication" (https://vercel.com/docs/plans/hobby).

**Answer for this project: no built-in option protects the production domain on Hobby. Period.**

Changelog check (nothing changes the above): "More Secure Deployment Protection" (2025-07-14, Standard Protection now also covers the production *git-branch* generated domain for new projects — the production domain itself stays public) https://vercel.com/changelog/more-secure-deployment-protection ; team-wide protection defaults (2026-01-13) https://vercel.com/changelog/set-team-wide-defaults-for-deployment-protection ; "Trusted Sources" OIDC bypass (2026-05-13) https://vercel.com/changelog/trusted-sources-for-deployment-protection ; Protected Source Maps (2026-05-14) https://vercel.com/changelog/protected-source-maps-ship-browser-source-maps-securely .

## 2. Does protection cover API routes, and what do blocked requests receive?

There is **no option usable on Hobby for production**, so this is academic for the ticket — but where protection applies:

- Coverage is total: "Deployment Protection requires authentication for all requests, including those to Routing Middleware." — https://vercel.com/docs/deployment-protection . API routes/serverless functions are not exempt.
- Browser page visits: "Users attempting to access the deployment will encounter a Vercel login redirect" and after login a cookie is set for that deployment URL — https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication
- Non-navigation requests (asset fetches, and by the same mechanism API `fetch` calls without the cookie): "Vercel's protection layer sees an unauthenticated request for the asset and returns a 401 Unauthorized status." — https://vercel.com/kb/guide/troubleshooting-cross-origin-errors-neterr-blocked-by-orb-with-deployment-protection
- Trusted IPs is the exception: blocked visitors get a **404** "No Deployment Found" page instead — https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/trusted-ips
- CORS preflight `OPTIONS` requests are also protected unless paths are added to the OPTIONS Allowlist — https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/options-allowlist
- Machine access needs the bypass header/query param `x-vercel-protection-bypass` (Protection Bypass for Automation) — https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation

## 3. PWA interplay — **largely unconfirmed by official docs**

**The official docs say nothing about PWAs, service workers, or web-app manifests under Deployment Protection.** Searched vercel.com/docs and vercel.com/kb; the Vercel Authentication, Password Protection, and Deployment Protection pages contain zero mention of `manifest`, `service worker`, or `PWA`.

What the docs *do* establish, from which risk can be inferred:

- Auth is delivered as a **cookie set after a login redirect**, and "tokens are valid for a single URL and are not reusable across different URLs" — https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication
- Any request arriving without that cookie gets a 401 (KB guide above). Manifest fetches and service-worker script fetches are non-navigation requests; if the webview/fetch context doesn't attach the cookie, they fail. **Whether iOS/Android standalone PWA webviews share the cookie jar with the browser that performed the Vercel login is not addressed anywhere in Vercel's docs — unconfirmed.**
- Secondary signal only (community forum, not an official source, flagged as such): users report 403/401 fetching `/manifest.webmanifest` behind protection — https://community.vercel.com/t/i-am-getting-403-when-trying-to-fetch-manifest-webmanifest/29932

Verdict: even if the plan allowed production protection, treating Vercel Authentication as PWA-safe would be a gamble the docs don't back.

## 4. Vercel Authentication specifics

Source: https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication

Authorized visitors:
- Logged-in team members with at least a Viewer role; logged-in project members (project Viewer+); members of an access group with project access
- Logged-in Vercel users who requested and were **granted access** — "Those on the Hobby plan can only have one external user per account"
- Anyone with a Shareable Link (per the Hobby/Pro comparison table, Shareable Links are listed under **Pro**: https://vercel.com/docs/plans/hobby)
- Automation using the bypass header

On Hobby the "team" is effectively the account owner ("Hobby teams can also enable or disable [it] for their own projects"), so the coach logged into his own Vercel account qualifies.

Phone flow: visitor hits the URL → redirected to Vercel login → if already logged into Vercel in that browser, authenticated automatically → redirected back with a cookie **scoped to that one URL** and non-transferable. Practically: the coach would need to log into vercel.com inside his phone browser once per protected URL. Users without access land on a "request access" screen that emails the owner.

## 5. Fallback: shared-secret pattern (recommended path)

Since built-in protection is unavailable for Hobby production, use the agreed fallback. Design that plays well with Vercel + PWA:

**Keep public:** app shell, `manifest.webmanifest`, service worker, icons — they contain no secrets, and leaving them open means install/offline behavior is completely untouched by auth. **Lock only `/api/*`** (the Notion proxy). The Notion token itself never leaves the server: it lives in a Vercel environment variable and is only read inside the API routes.

**Mechanism — long-lived cookie checked in Routing Middleware:**
- Vercel's Routing Middleware "executes code before a request is processed on a site" and can inspect the request and return a response (e.g. a 401) before anything else runs — https://vercel.com/docs/routing-middleware . A root `middleware.ts` works with any framework; runtime is Edge by default, Node.js optional. The docs list no plan gate; it's billed as normal fluid compute (https://vercel.com/docs/routing-middleware, Pricing section).
- Sketch: a `POST /api/login` route compares a submitted passphrase (constant-time) against an `APP_SECRET` env var and sets an `HttpOnly; Secure; SameSite=Lax; Max-Age=<1 year>; Path=/` cookie containing an HMAC/signed value. `middleware.ts` matches `/api/:path*` (everything except `/api/login`), verifies the cookie, and returns `new Response(null, { status: 401 })` otherwise.
- Why cookie over an `Authorization` header from the app shell: the browser attaches cookies automatically to same-origin fetches, including anything the service worker replays — no token-in-JS storage, no header plumbing, and it survives standalone-mode launches. A header scheme would also work (the shell holds the secret in `localStorage` and adds it per fetch) but stores the secret readable by any JS and needs every call site wired.
- Belt-and-braces: since middleware config/matchers can be misconfigured silently, also check the cookie (or a shared helper) at the top of the proxy route handler itself, so the Notion proxy fails closed even if middleware is bypassed.
- Vercel has no dedicated "protect your routes with middleware" guide in the docs; the Routing Middleware docs above are the closest official guidance (personalization/redirects/headers "before returning a response"). Flagged: the specific auth-cookie pattern is standard practice, not verbatim from Vercel docs.

## 6. Hobby usage limits (order of magnitude)

From https://vercel.com/docs/plans/hobby (per month unless noted):

- Function invocations: first **1,000,000**
- Active CPU: **4 CPU-hours**; provisioned memory: **360 GB-hours**
- Edge requests: up to **1,000,000**
- Deployments: **100/day**; function max duration 300s; runtime logs kept 1 hour
- Exceeding a limit pauses that feature for up to 30 days (no overage billing on Hobby)

A single-user tracker doing a few hundred Notion-proxy calls a day is roughly 0.1–1% of the invocation budget. Non-issue.

---

## Open items / unconfirmed

- **PWA behavior under Vercel Authentication** — officially undocumented (Q3). Only relevant if the coach ever upgrades to Pro + add-on.
- **Actual account plan** — assumed Hobby per ticket framing; needs the coach to confirm (HITL, as the ticket notes). If he's on Pro, production lock still requires the **$150/mo Advanced Deployment Protection add-on**, which is hard to justify for this app.
- Exact ambiguity between "All Deployments: available on Pro" and "Private Production Deployments: $150 add-on for Pro" on https://vercel.com/docs/deployment-protection — the add-on section is the more specific statement; checking the project's Deployment Protection settings screen on the real account would settle it in one click.
