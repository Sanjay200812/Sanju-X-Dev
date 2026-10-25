# SANJU X DEV

Fresh business website built from the empty GitHub repository. No previous website source or visual design was reused. Official logo retained; project screenshots captured from the five supplied live sites on 22 October 2026, with TicketX interface captures refreshed on 25 October. The 25 October user reference informed the paper/editorial mood, not copied layout or imagery.

## Development

Node.js 22+ is required. Run `npm ci`, then `npm run dev` (http://127.0.0.1:3100). Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` before pushing. `node scripts/seed.mjs` synchronizes the server defaults after editing `src/content.ts`. `node scripts/assets.mjs` produces optimized web images from originals.

## Implemented

- Original parchment editorial business pages, paper grain, layered real-project cards, six service categories, guided enquiry and privacy/404 views.
- Exactly three persistent themes, unchanged official logo, 3.6-second skip-enabled session intro and reduced-motion handling.
- Five projects in the required order, case studies, live links, real desktop/mobile screenshots, fullscreen viewer, search and filters.
- Separate CodeXa Co-Founder affiliation on Home and About.
- spideyy FAQ mode, optional server-side OpenAI Responses integration, bounded input and database-backed AI request limits.
- Owner password authentication plus server-side scrypt secondary PIN verification and expiring HttpOnly session cookie.
- Project/case-study editing, ordering, publishing, page/contact/service/FAQ/SEO/theme editing, enquiry status/private notes/CSV, media uploads/deletion and activity logs.
- Server validation, same-origin mutations, private RLS-enabled tables and atomic rate limiting.

## Connected backend and private owner setup

The dedicated SANJU X DEV Supabase project is `sdhhuqybwvrffvgzextd`, in Sanjay200812's Org. The migration and `studio` Edge Function are deployed. Vercel Preview calls this function through its same-origin API. Privileged credentials remain inside Supabase; Vercel only holds the public gateway key. A real browser enquiry was saved and read back from the database on 25 October 2026. The synthetic test record is labelled and closed.

The only authorized owner is Supabase Auth UID `3984ceee-869a-432f-a5dd-23eb615d234d`. Its existence in this dedicated project was verified. The server checks the authenticated UID, and private CRUD uses the owner's JWT so RLS independently enforces that UID, an unexpired secondary-code unlock and a live Supabase Auth session. All other users are denied. Session hashes, rate data and PIN verifiers have no browser grants. The private helper uses a fixed search path and checks auth identity; user-editable metadata never grants authority.

Owner access:

1. Open `/spideyy` on the deployment. The old `/admin` route redirects directly to `/spideyy`.
2. Primary Login — Secret Code: Enter your private high-entropy secret code or passphrase. Unsuccessful attempts are strictly limited to 3 before a database-backed 3-minute lockout is enforced with remaining time display.
3. Secondary Login — "Login with spideyy": Allows signing in with existing Supabase Auth owner credentials (email & password), protected by an independent 3-attempt/3-minute lockout.
4. On first sign-in (or setup), configure a high-entropy secret code (minimum 8 characters). The server stores a salted scrypt verifier inaccessible to browser clients.
5. Unlocks issue an expiring HttpOnly, SameSite=Strict cookie (30-minute validity). Sign out everywhere revokes all active unlock sessions.
6. Do not share your password or secret code in chat or repository files.

The Vercel Preview variables (`STUDIO_EDGE_URL`, `STUDIO_EDGE_ANON_KEY`, `SITE_URL`, and both `VITE_SUPABASE_*` variables) are configured. Optional `OPENAI_API_KEY` and `OPENAI_MODEL` belong in Supabase Edge Function Secrets. Optional `RESEND_API_KEY` and `RESEND_FROM_EMAIL` enable automatic email notification alerts to `OWNER_NOTIFICATION_EMAIL` (default: `sanjuxdev27@gmail.com`). `ADMIN_PIN_VERIFIER` is an optional server-secret override for managed recovery.

### Alternative local or direct Vercel backend setup

Use a dedicated SANJU X DEV Supabase project, not CodeXa or another application's database. Apply all SQL files in `supabase/migrations` in timestamp order to that project. Disable public sign-ups and create/invite the owner through Supabase. Complete the password setup privately; use only the exact owner UID enforced in the source and migration.

Copy `.env.example` to ignored `.env.local` for development. Set the same variables in Vercel:

| Variable                      | Purpose                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| VITE_SUPABASE_URL             | Dedicated project URL, public                                                    |
| VITE_SUPABASE_PUBLISHABLE_KEY | Public publishable key for owner login                                           |
| SUPABASE_URL                  | Same project URL, server                                                         |
| SUPABASE_SERVICE_ROLE_KEY     | Server-only privileged key; never put it in a VITE variable                      |
| ADMIN_PIN_VERIFIER            | Salted scrypt verifier, generated with `powershell -File scripts/create-pin.ps1` |
| RATE_LIMIT_SALT               | Long random secret for hashed rate identifiers                                   |
| SITE_URL                      | Exact deployment origin; local default is http://127.0.0.1:3100                  |
| RESEND_API_KEY                | Optional server-only Resend API key for instant enquiry notification emails     |
| RESEND_FROM_EMAIL             | Optional verified sender address (e.g. `SANJU X DEV <onboarding@resend.dev>`)   |
| OWNER_NOTIFICATION_EMAIL      | Owner email for enquiry alerts (default: `sanjuxdev27@gmail.com`)               |
| OPENAI_API_KEY                | Optional server-only AI credential                                               |
| OPENAI_MODEL                  | Optional enabled Responses model name                                            |
| VERCEL_PROJECT_ID             | Optional Vercel Web Analytics project ID for traffic telemetry                   |
| VERCEL_AUTH_TOKEN             | Optional Vercel Web Analytics read token                                         |

Restart/redeploy after changing configuration. Open `/spideyy`, sign in with your secret code or spideyy credentials. Publish changes once to initialize the content document. No records are fabricated, and missing backend configuration never returns enquiry success. The secondary code is not a standalone login. Sign-out revokes all unlock records; sessions expire after 30 minutes.

Enquiries are private and support real-time notification alerts, unread status tracking, service and status filtering, date sorting, copy-email, and CSV export.

## Assistant

spideyy operates in enhanced FAQ guide mode with comprehensive knowledge of all six services, five portfolio case studies, and guided enquiry pathways with interactive navigation links. AI mode sends questions and verified facts to OpenAI with `store:false`, limits output and falls back on provider errors. Per-IP AI limit: 20/hour; global cap: 100/day.

## Deployment and approval

Work branch: `feature/spideyy-admin-upgrade`. Main is preserved. Vercel project: `sanju-x-dev`. Production SEO is configured with canonical URLs, Schema.org JSON-LD structured data, Open Graph tags, sitemap.xml and robots.txt; `/spideyy`, `/admin`, and `/api/` are strictly excluded from indexing via `X-Robots-Tag: noindex, nofollow, noarchive` and robots.txt disallow rules. Do not promote or merge without owner approval.

Static metadata is exported for public routes at build time. Rebuild after content/SEO changes; dynamic browser content refreshes on page reload. Unknown SPA paths can return HTTP 200 with the custom 404. Newly added project slugs may need a rebuild for static route metadata. Project technology claims are limited to observed Vercel hosting; unverified conversion, payment, booking and sole-authorship claims are omitted.

## Verification and remaining acceptance

All 17 automated tests pass, as do ESLint, TypeScript and the production build. Tests cover input validation, PIN hashing, content URL safety, requested project ordering, theme validation, origin restrictions, honest unconfigured responses, FAQ behavior and PostgreSQL migration/RLS/rate limiting using PGlite.

Deployed checks passed: home, work, all five case-study routes, services, about, contact, privacy, admin entry and custom 404; three themes and persisted selection; intro playback; project search; mobile/desktop screenshot switch and fullscreen viewer; phone navigation; FAQ reply; browser enquiry submission with database readback. API site returns five projects and backendReady=true; anonymous admin returns 401; cross-origin mutation returns 403. Supabase security advisor reports intentional no-policy informational notices on server-only tables; leaked-password protection is disabled and should be enabled in Auth settings where the plan supports it. No application console errors were observed during the route checks. Layouts were inspected at phone and desktop widths; this is not a formal WCAG certification or performance score.

Before production: configure and verify real owner login/PIN, content persistence through the dashboard, project publish/unpublish, media upload/delete, inbox/CSV, session revocation and optional AI provider responses. Run a production performance/accessibility audit and broader device/browser coverage. Production remains untouched. Preview access is protected by Vercel; the review share link expires after 23 hours, while the owner can access the deployment through Vercel login.
