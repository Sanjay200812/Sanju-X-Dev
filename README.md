# SANJU X DEV

Fresh business website built from the empty GitHub repository. No previous website source or visual design was reused. Official logo retained; project screenshots captured from the five supplied live sites on 22 October 2026.

## Development

Node.js 22+ is required. Run `npm ci`, then `npm run dev` (http://127.0.0.1:3100). Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` before pushing. `node scripts/seed.mjs` synchronizes the server defaults after editing `src/content.ts`. `node scripts/assets.mjs` produces optimized web images from originals.

## Implemented

- Original responsive business pages, six service categories, guided enquiry and privacy/404 views.
- Exactly three persistent themes, unchanged official logo, 3.6-second skip-enabled session intro and reduced-motion handling.
- Five projects in the required order, case studies, live links, real desktop/mobile screenshots, fullscreen viewer, search and filters.
- Separate CodeXa Co-Founder affiliation on Home and About.
- spideyy FAQ mode, optional server-side OpenAI Responses integration, bounded input and database-backed AI request limits.
- Owner password authentication plus server-side scrypt secondary PIN verification and expiring HttpOnly session cookie.
- Project/case-study editing, ordering, publishing, page/contact/service/FAQ/SEO/theme editing, enquiry status/private notes/CSV, media uploads/deletion and activity logs.
- Server validation, same-origin mutations, private RLS-enabled tables and atomic rate limiting.

## Dedicated backend setup — required before live admin/enquiries

Use a dedicated SANJU X DEV Supabase project, not CodeXa or another application's database. Apply `supabase/migrations/20261022115919_premium_studio.sql` to that project. Disable public sign-ups and create/invite the owner through Supabase. Complete the password setup privately; set the owner's UUID as `OWNER_USER_ID`.

Copy `.env.example` to ignored `.env.local` for development. Set the same variables in Vercel's Preview environment:

| Variable | Purpose |
| --- | --- |
| VITE_SUPABASE_URL | Dedicated project URL, public |
| VITE_SUPABASE_PUBLISHABLE_KEY | Public publishable key for owner login |
| SUPABASE_URL | Same project URL, server |
| SUPABASE_SERVICE_ROLE_KEY | Server-only privileged key; never put it in a VITE variable |
| OWNER_USER_ID | Exact allowed owner UUID |
| ADMIN_PIN_VERIFIER | Salted scrypt verifier, generated with `powershell -File scripts/create-pin.ps1` |
| RATE_LIMIT_SALT | Long random secret for hashed rate identifiers |
| SITE_URL | Exact deployment origin; local default is http://127.0.0.1:3100 |
| OPENAI_API_KEY | Optional server-only AI credential |
| OPENAI_MODEL | Optional enabled Responses model name |

Restart/redeploy after changing configuration. Open `/admin`, sign in, then enter the secondary code. Publish changes once to initialize the content document. No records are fabricated, and missing backend configuration never returns enquiry success. The secondary code is not a standalone login. Sign-out revokes all unlock records; sessions expire after 30 minutes. Authenticator MFA is not included in this version.

Media is public once uploaded. Use PNG/JPEG/WebP under 3 MB. To replace media, upload a new file, update the content URL, then delete the old file. Enquiries are private; the list and CSV contain the latest 500 records. Media lists up to 100 files; audit lists the latest 50 events. Schedule cleanup of expired session/rate-limit rows and define retention before launch.

## Assistant

Without AI credentials, the assistant identifies itself as “FAQ guide”. AI mode sends the question and published business facts to OpenAI with `store:false`, limits output and falls back on provider errors. It has no tools or write access. Requirements are collected through the consent-based contact wizard. Per-IP AI limit: 20/hour; global cap: 100/day. Set a provider spending cap too. No email notification provider is connected; enquiries, once configured, appear in the owner inbox.

## Deployment and approval

Work branch: `sanju-x-dev-premium-redesign`. Main is preserved. Vercel project: `sanju-x-dev`. Deploy this branch as a preview. This version intentionally uses noindex headers/metadata and disallows crawling. Remove preview indexing restrictions only as part of an approved production release. Do not promote or merge without owner approval.

Static metadata is exported for public routes at build time. Rebuild after content/SEO changes; dynamic browser content refreshes on page reload. Unknown SPA paths can return HTTP 200 with the custom 404. Newly added project slugs may need a rebuild for static route metadata. Project technology claims are limited to observed Vercel hosting; unverified conversion, payment, booking and sole-authorship claims are omitted.

## Verification and remaining acceptance

Automated checks cover input validation, PIN hashing, content URL safety, requested project ordering, theme validation, origin restrictions, honest unconfigured responses, FAQ behavior and PostgreSQL migration/RLS/rate limiting using PGlite. This is not a live Supabase integration test.

Before production: configure and verify real owner login/PIN, content persistence, project publish/unpublish, media upload/delete, enquiry insertion/inbox/CSV, session revocation and optional AI provider responses. Run a production performance/accessibility audit and broader device/browser coverage. No live backend operation is claimed working until the dedicated project is configured and tested.
