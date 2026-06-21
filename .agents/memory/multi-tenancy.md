---
name: Multi-tenancy architecture
description: How tenant isolation is implemented across the stack
---

## Data layer
- `companies` table is the root tenant entity
- `company_id INTEGER` (nullable FK → companies.id) added to: leads, customers, properties, tasks, payments
- All existing data migrated to company_id = 1 ("Default Company", slug: 'default')

## Auth / Clerk
- Role stored in `user.publicMetadata.role` (string)
- Company stored in `user.publicMetadata.company_id` (number)
- Super admin: role = "super_admin", no company_id needed
- All others: role + company_id must both be set

## Server middleware chain
1. `requireAuth` — verifies Clerk session (applied globally to all /api routes in routes/index.ts)
2. `requireTenant` — reads publicMetadata, sets `req.companyId` (number|null) + `req.isSuperAdmin` (boolean)
   - Super admin: companyId = null, isSuperAdmin = true
   - Others: companyId = parsed company_id, isSuperAdmin = false
   - Returns 403 if no company_id set
3. Route handlers: `if (!req.isSuperAdmin && req.companyId) conditions.push(eq(table.companyId, req.companyId))`

## Special route exemptions
- `/api/companies` — no requireTenant (super_admin manages all companies)
- `/api/client/*` — no requireTenant (client routes scope by clerk_user_id not company)
- `/api/admin/*` — requireTenant applied inside per-route as needed

**Why:** Client routes use clerkUserId to find the customer record (no company needed). Companies route handles its own auth via requireRole("super_admin").
