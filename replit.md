# Estate Hub — Real Estate CRM

A full-stack Real Estate CRM SaaS built for Bangladesh real estate companies. Sales teams use it to manage leads through the full pipeline, track customers, manage property inventory, and coordinate tasks.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/crm run dev` — run the CRM frontend (proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Wouter router, Tanstack Query
- Auth: Clerk (Replit-managed, email/password + Google)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB tables: leads, customers, properties, tasks
- `artifacts/api-server/src/routes/` — Express route handlers (dashboard, leads, customers, properties, tasks)
- `artifacts/crm/src/pages/` — Frontend pages

## Architecture decisions

- OpenAPI-first: spec drives both Zod server validators and React Query client hooks via Orval codegen
- Clerk proxy is mounted before body parsers so it streams raw bytes correctly
- Price stored as `numeric(14,2)` in DB, parsed to `float` in API responses
- Tasks join on leads table to return `leadName` inline (avoids a separate request)
- Dashboard summary uses SQL aggregations not application-level counting

## Product

- **Dashboard** — stat cards (total/new/hot leads, site visits, bookings, sold this month), pipeline chart, activity feed
- **Lead Management** — full CRUD with source (Facebook/Website/WhatsApp/Walk-in/Referral) and pipeline status tracking
- **Pipeline Kanban** — visual board across 7 stages: New → Contacted → Interested → Site Visit → Negotiation → Booking → Sold
- **Customer Module** — profile, contact info, NID, notes
- **Properties** — project name, location, unit number, BDT price, availability
- **Tasks** — linked to leads, due dates, status (Pending/In Progress/Done)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any schema change in `lib/db/`, run `pnpm --filter @workspace/db run push` then `pnpm run typecheck:libs`
- After any OpenAPI spec change, run codegen before touching server routes
- `@clerk/themes` must be installed in the crm artifact (shadcn theme)
- Clerk dev keys show a "Development mode" banner — this is expected and harmless

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
